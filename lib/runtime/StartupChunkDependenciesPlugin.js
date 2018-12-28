/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Compiler")} Compiler */

class StartupChunkDependenciesPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"StartupChunkDependenciesPlugin",
			compilation => {
				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					"StartupChunkDependenciesPlugin",
					(chunk, set) => {
						for (const _ of compilation.chunkGraph.getChunkEntryDependentChunksIterable(
							chunk
						)) {
							set.add(RuntimeGlobals.startup);
							set.add(RuntimeGlobals.ensureChunk);
							set.add(RuntimeGlobals.ensureChunkIncludeEntries);
							compilation.addRuntimeModule(
								chunk,
								new StartupChunkDependenciesRuntimeModule(
									chunk,
									compilation.chunkGraph
								)
							);
							break;
						}
					}
				);
			}
		);
	}
}

class StartupChunkDependenciesRuntimeModule extends RuntimeModule {
	constructor(chunk, chunkGraph) {
		super("startup chunk dependencies");
		this.chunk = chunk;
		this.chunkGraph = chunkGraph;
	}

	generate() {
		const { chunk, chunkGraph } = this;
		const promises = Array.from(
			chunkGraph.getChunkEntryDependentChunksIterable(chunk)
		).map(chunk => {
			return `${RuntimeGlobals.ensureChunk}(${JSON.stringify(chunk.id)})`;
		});
		return Template.asString([
			`var next = ${RuntimeGlobals.startup};`,
			`${RuntimeGlobals.startup} = function() {`,
			Template.indent([
				promises.length === 1
					? `return ${promises[0]}.then(next);`
					: Template.asString([
							"return Promise.all([",
							Template.indent(promises.join(",\n")),
							"]).then(next);"
					  ])
			]),
			"}"
		]);
	}
}

module.exports = StartupChunkDependenciesPlugin;
