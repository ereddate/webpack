/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

const createChunkNameExpr = obj => {
	const optimizedObj = {};
	let hasEntries = false;
	for (const key of Object.keys(obj)) {
		const value = obj[key];
		if (key !== value) {
			optimizedObj[key] = value;
			hasEntries = true;
		}
	}
	return hasEntries
		? `(${JSON.stringify(optimizedObj)}[chunkId]||chunkId)`
		: "chunkId";
};

class GetChunkFilenameRuntimeModule extends RuntimeModule {
	constructor(
		compilation,
		chunk,
		contentType,
		name,
		global,
		filename,
		getFilenameForChunk
	) {
		super(`get ${name} chunk filename`);
		this.compilation = compilation;
		this.chunk = chunk;
		this.contentType = contentType;
		this.global = global;
		this.filename = filename;
		this.getFilenameForChunk = getFilenameForChunk;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const {
			global,
			chunk,
			contentType,
			filename,
			getFilenameForChunk,
			compilation
		} = this;
		const mainTemplate = compilation.mainTemplate;
		const chunkMaps = chunk.getChunkMaps();
		const staticUrls = new Map();
		const includeEntries = compilation.chunkGraph
			.getTreeRuntimeRequirements(chunk)
			.has(RuntimeGlobals.ensureChunkIncludeEntries);
		if (includeEntries) {
			for (const c of compilation.chunkGraph.getChunkEntryDependentChunksIterable(
				chunk
			)) {
				const chunkFilename = getFilenameForChunk(c) || filename;
				staticUrls.set(
					c.id,
					mainTemplate.getAssetPath(JSON.stringify(chunkFilename), {
						hash: `" + ${RuntimeGlobals.getFullHash}() + "`,
						chunk: c,
						contentHashType: contentType
					})
				);
			}
		}
		const url = mainTemplate.getAssetPath(JSON.stringify(filename), {
			hash: `" + ${RuntimeGlobals.getFullHash}() + "`,
			hashWithLength: length =>
				`" + ${RuntimeGlobals.getFullHash}().slice(0, ${length}) + "`,
			chunk: {
				id: `" + chunkId + "`,
				hash: `" + ${JSON.stringify(chunkMaps.hash)}[chunkId] + "`,
				hashWithLength(length) {
					const shortChunkHashMap = Object.create(null);
					for (const chunkId of Object.keys(chunkMaps.hash)) {
						if (typeof chunkMaps.hash[chunkId] === "string") {
							shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(
								0,
								length
							);
						}
					}
					return `" + ${JSON.stringify(shortChunkHashMap)}[chunkId] + "`;
				},
				name: `" + ${createChunkNameExpr(chunkMaps.name)} + "`,
				contentHash: {
					[contentType]: `" + ${JSON.stringify(
						chunkMaps.contentHash[contentType]
					)}[chunkId] + "`
				},
				contentHashWithLength: {
					[contentType]: length => {
						const shortContentHashMap = {};
						const contentHash = chunkMaps.contentHash[contentType];
						if (!contentHash) return "XXXX";
						for (const chunkId of Object.keys(contentHash)) {
							if (typeof contentHash[chunkId] === "string") {
								shortContentHashMap[chunkId] = contentHash[chunkId].substr(
									0,
									length
								);
							}
						}
						return `" + ${JSON.stringify(shortContentHashMap)}[chunkId] + "`;
					}
				}
			},
			contentHashType: contentType
		});
		return Template.asString([
			`${global} = function(chunkId) {`,
			Template.indent([
				staticUrls.size > 0
					? Template.asString([
							"switch(chunkId) {",
							Template.indent(
								Array.from(staticUrls).map(
									([id, url]) => `case ${JSON.stringify(id)}: return ${url};`
								)
							),
							"}"
					  ])
					: "// no static urls",
				includeEntries ? "// would include entries" : "",
				"// return url for filenames based on template",
				`return ${url};`
			]),
			"};"
		]);
	}
}

module.exports = GetChunkFilenameRuntimeModule;
