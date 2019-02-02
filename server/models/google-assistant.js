'use strict';

module.exports = function (GoogleAssistant) {

  GoogleAssistant.subscribe = function (email, phrase, callback) {
    console.log(email, phrase);
    GoogleAssistant.app.models.Account.findOne({ where: { email: email } }, function (err, user) {
      console.log(err, user);
      if (err || !user) return callback(new Error());
      user.subscriptions.create({ phrase: phrase }, callback);
    });
  }

  GoogleAssistant.unsubscribe = function (email, phrase, callback) {
    GoogleAssistant.app.models.Account.findOne({ where: { email: email } }, function (err, user) {
      if (err || !user) return callback(new Error());
      user.subscriptions.findOne({ phrase: phrase }, function (err, subscription) {
        if (err || !subscription) return callback(new Error());
        subscription.destroy(callback);
      });
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
      user.subscriptions({}, callback);
    });
  }

};
