module.exports = {
	entry: "./index",
	target: "node",
	output: {
		filename: "[name].js",
		libraryTarget: "commonjs2"
	},
	optimization: {
		splitChunks: {
			minSize: 1,
			chunks: "all"
		}
	}
};
