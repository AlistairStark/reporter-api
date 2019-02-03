'use strict';

module.exports = function(Video) {

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
	 * 	@param	{object}	event 	Data sent by the remote source
	 * 	@param	{string}	type 	Must be equal to "video". Otherwise, this hook is ignored.
	 * 	@param 	{object}	data 	Data that will be saved as a VideoEntry
	 */
	Video.receive = function(event) {
		event = event || {};

		if (event.type !== 'video' || !event.data) {
			console.log("INVALID EVENT: ", event);
			return;
		}

		var data = event.data || {};
		
		// Make sure all tags are written in lower case
		data.tags = (data.tags || []).join('|').toLowerCase().split('|');

		Video.create(data);
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
			{ arg: 'event', type: 'object', 'http': { source: 'body' } }
		],
		returns: {},
		http: { path: '/receive', verb: 'post' }
	});

};
