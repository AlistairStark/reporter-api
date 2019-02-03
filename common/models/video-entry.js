'use strict';

module.exports = function(Video) {

	Video.validatesUniquenessOf('url');

	// After creating a new video, makes call to FeedItem model so it 
	// creates relationships with all users subscribed to any of the video's tags
	Video.observe('after save', function(ctx, next) {

        var data = ctx.instance || {};

        if (ctx.isNewInstance && data.id) {
            Video.app.models.FeedItem.feedVideo(data);
        }

        next();
    })

	/**
	 * 	Retrieves timestamp of when our most recently updated 
	 * 	video was updated.
	 * 	@param		{function}	callback	Callback function with arguments (error, response)
	 * 	@returns 	{number}				Timestamp of last update (or 1, if empty)
	 */
	Video.getMostRecent = function(callback) {
		Video.find({ order: 'updatedAt DESC', limit: 1 }, function(err, res) {
			var lastUpdated = ((res || [])[0] || {}).updatedAt || 1;
			return callback(err, lastUpdated);
		})
	}

	/**
	 * 	Receives a webhook with information about a video 
	 * 	that should be inserted in the database.
	 * 	@param	{object}	event 			Data sent by the remote source
	 * 	@param	{string}	event.type 		Must be equal to "video". Otherwise, this hook is ignored.
	 * 	@param 	{object}	event.data 		Data that will be saved as a VideoEntry
	 * 	@param 	{object}	response 		Express response object
	 */
	Video.receive = function(event, response) {
		console.log("RECEIVING EVENT!");
		event = event || {};

		if (event.type !== 'video' || !event.data) {
			console.log("INVALID EVENT: ", event);
			return response.status(400).send("Invalid Event");
		}

		var data = event.data || {};
		
		// Make sure all tags are written in lower case
		data.tags = (data.tags || []).join('|').toLowerCase().split('|')
			.reduce(function(arr, tag) {		// Remove any leftover duplicates
				if (arr.indexOf(tag) < 0) {
					arr.push(tag);
				}
				return arr;
			}, []);

		Video.findOrCreate({ where: { url: data.url } }, data, function(err, video, created) {
			if (err) return response.status(500).send(err);

			if (!created) {
				if (!video.tags) {
					video.tags = [];
				}

				data.tags.forEach(function(tag) {
					if (video.tags.indexOf(tag) < 0) {
						video.tags.push(tag);
					}
				})

				video.save();
				return response.status(200).send("Success: Merged with old video");
			}

			response.status(200).send("Success: Created new");
		});
		
	}

	// Remote method signatures --------------------------------------------------------------
	
	Video.remoteMethod('getMostRecent', {
		accepts: [],
		returns: {
			type: "number",
			root: true,
			description: "The timestamp representing the update date of the most recently updated video entry we have."
		},
		http: { path: '/getMostRecent', verb: 'get' }
	});

	Video.remoteMethod('receive', {
		accepts: [
			{ arg: 'event', type: 'object', 'http': { source: 'body' } },
			{ arg: 'response', type: 'object', 'http': { source: 'res' } }
		],
		returns: {},
		http: { path: '/receive', verb: 'post' }
	});

};
