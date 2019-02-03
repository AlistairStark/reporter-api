'use strict';

const request = require('request');
const async = require('async');

module.exports = function (GoogleAssistant) {

  const CBC_VIDEO_BASE_URL = 'https://www.cbc.ca/aggregate_api/v1/items/';  // Need to add the item ID to the end of the URL

  GoogleAssistant.subscribe = function (data, callback) {
    console.log(data.email, data.phrase);
    if (!data || !data.email || !data.phrase) return callback(new Error('not correct post content'));
    let email = data.email;
    let phrase = data.phrase;
    GoogleAssistant.app.models.Account.findOne({ where: { email: email } }, function (err, user) {
      console.log(err, user);
      if (err || !user) return callback(err || new Error());

      phrase = phrase.toLowerCase();

      if (!user.subscriptions) {
        user.subscriptions = [];
      }

      if (user.subscriptions.indexOf(phrase) < 0) {
        user.subscriptions.push(phrase);
        user.save();
        return GoogleAssistant.app.models.FeedItem.feedUser(user.id, phrase, callback);
      }

      callback();
    });
  }

  GoogleAssistant.unsubscribe = function (email, phrase, callback) {
    GoogleAssistant.app.models.Account.findOne({ where: { email: email } }, function (err, user) {
      if (err || !user) return callback(new Error());

      var i = (user.subscriptions || []).indexOf(phrase);

      if (i >= 0) {
        user.subscriptions.splice(i, 1);
        user.save();
        return GoogleAssistant.app.models.FeedItem.unfeedUser(user.toJSON(), callback);
      }

      callback();
    });
  }

  GoogleAssistant.help = function (callback) {
    const helpMessage = '';
    return callback(null, helpMessage);
  }

  GoogleAssistant.recent = function (email, callback) {
    GoogleAssistant.app.models.Account.findOne({ where: { email: email }, include: { feedItems: 'video' } }, function (err, user) {
      if (err || !user) return callback(new Error());

      var json = user.toJSON();

      var tasks = (json.feedItems || []).reduce(function(arr, feed) {

        var video = (feed || {}).video || {};

        if (video.cbcId) {
          arr.push(function(cb) {
            request(CBC_VIDEO_BASE_URL + video.cbcId, function(error, response, body) {
              try {
                body = JSON.parse(body);
                if (body.typeAttributes.show == '(not specified)') {
                  delete body.typeAttributes.show;
                }

                body.userSubscribed = (video.tags || []).reduce(function(arr, tag) {
                  if ((user.subscriptions || []).indexOf(tag) >= 0) {
                    arr.push(tag);
                  }
                  return arr;
                }, []);
              }
              catch(e) {
                error = e;
              }

              cb(error, body);
            })
          })
        }
        return arr;
      }, []);

      async.parallel(tasks, callback);
    });
  }
  GoogleAssistant.mySubscriptions = function (email, callback) {
    GoogleAssistant.app.models.Account.findOne({ where: { email: email } }, function (err, user) {
      if (err || !user) return callback(new Error());
      callback(null, user.subscriptions);
    });
  }

};
