'use strict';

var async = require('async');

module.exports = function(Feed) {

	/**
	 * 	Creates new feeds for one user who just subscribed to a new tag.
	 * 	Retrieves all videos that contain that tag and adds new 
	 * 	FeedItems to link that user to the video.
	 * 	@param 	{string}	userId 		The ID of the user who just subscribed to a new tag
	 * 	@param 	{string}	tag 		The tag that the user subscribed to
	 * 	@param 	{function=}	callback 	Callback function with arguments (error, result). If set, returns the result of the asynchronous call to create new Feeds for this user.
	 */
	Feed.feedUser = function(userId, tag, callback) {

		if (!callback || typeof callback !== 'function') {
			callback = function(err, res) { return; }
		}

		if (!tag || !userId) return callback(); 

		Feed.app.models.VideoEntry.find({ where: { tags: { inq: [ tag ] } } }, function(err, videos) {
			if (err || !videos) return callback(err);

			console.log("Found videos containing any of this user's new tag: ", videos.length);

			var tasks = videos.reduce(function(arr, video) {
				if (video.id) {
					arr.push(function(cb) {
						var toAdd = {
							userId: userId,
							videoId: video.id
						}

						Feed.findOrCreate({ where: toAdd }, toAdd, cb);
					})
				}

				return arr;
			}, []);

			async.parallel(tasks, function(err, res) {
				if (err) console.log("ERROR: ", err);
				console.log("\n\nINSERTED: ", res.length);
				callback(err, res);
			})
		})
	}

	/**
	 * 	Creates new feeds for users who are 
	 * 	subscribed to any of this video's tags.
	 * 	@param 	{object}	data 		Object representing a Video 
	 * 	@param	{string}	data.id 	VideoEntry ID
	 * 	@param 	{string[]}	data.tags	An array of strings with all the tags related to this video
	 * 	@param 	{function=}	callback 	Callback function with arguments (error, result). If set, will return the result from the asynchronous call to create new feeds about this video
	 */
	Feed.feedVideo = function(data, callback) {
		data = data || {};

		if (!callback || typeof callback !== 'function') {
			callback = function(err, res) { console.log("returning..."); return };
		}
		
		console.log("data: ", data);

		if (!data.tags || !data.id) return callback();

		Feed.app.models.Account.find({ where: { subscriptions: { inq: data.tags } } }, function(err, accounts) {
			console.log("err: ", err);
			if (err || !accounts) return callback(err);

			console.log("Found accounts subscribed to any of the video's tags: ", accounts.length);

			var tasks = accounts.reduce(function(arr, account) {
				if (account.id) {
					arr.push(function(cb) {
						var toAdd = {
							userId: account.id,
							videoId: data.id
						}

						Feed.findOrCreate({ where: toAdd }, toAdd, cb);
					})
				}

				return arr;
			}, []);

			async.parallel(tasks, function(err, res) {
				if (err) console.log("ERROR: ", err);
				console.log("\n\nINSERTED: ", res.length);
				callback(err, res);
			})
		})
	}

	/**
	 * 	Checks all feeds related to a user to see if there's any that 
	 * 	doesn't have any of the user's tag anymore.
	 * 	Called when the user unsubscribes from something.
	 * 	@param	{object}	user 				Object representing a user
	 * 	@param 	{string}	user.id 			The User ID
	 * 	@param	{string[]}	user.subscriptions	Tags that the user has subscribed to
	 * 	@param	{function=}	callback 			Callback function with arguments (error, result). If set, will return an array with all the feeds that were destroyed (in json format)
	 */
	Feed.unfeedUser = function(user, callback) {

		user = user || {};

		if (!callback || typeof callback !== 'function') {
			callback = function(err, res) { return };
		}

		var userSubs = user.subscriptions || [];

		if (!user.id || !userSubs.length === 0) return callback();

		// A more specific query could be used for better performance
		var filter = {
			where: {
				userId: userId
			},
			include: 'video'
		}

		Feed.find(filter, function(err, feeds) {
			feeds = feeds || [];
			if (err || feeds.length == 0) return callback(err);

			var destroyed = [];

			feeds.forEach(function(feed) {
				if (feed.toJSON()) {
					var json = feed.toJSON()
					var tags = (json.video || {}).tags || [];

					var hasTag = tags.find(function(tag) {
						return userSubs.indexOf(tag) >= 0;
					})

					if (!hasTag) {
						feed.destroy();
						destroyed.push(json);
					}
				}
			});
			
			return callback(null, destroyed);
		})
	}

};
