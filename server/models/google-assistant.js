'use strict';

module.exports = function (GoogleAssistant) {

  GoogleAssistant.subscribe = function (email, phrase, callback) {
    console.log(email, phrase);
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
        return GoogleAssistant.app.models.Feed.feedUser(user.id, phrase, callback);
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
        return GoogleAssistant.app.models.Feed.unfeedUser(user.toJSON(), callback);
      }

      callback();
    });
  }

  GoogleAssistant.help = function (callback) {
    const helpMessage = '';
    return callback(null, helpMessage);
  }

  GoogleAssistant.recent = function (email, callback) {
    GoogleAssistant.app.models.Account.findOne({ where: { email: email } }, function (err, user) {
      if (err || !user) return callback(new Error());
      user.feedItems({}, callback);
    });
  }

  GoogleAssistant.mySusbcriptions = function (email, callback) {
    GoogleAssistant.app.models.Account.findOne({ where: { email: email } }, function (err, user) {
      if (err || !user) return callback(new Error());
      callback(null, user.subscriptions);
    });
  }

};
