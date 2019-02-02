'use strict';

module.exports = function (Account) {
    Account.observe('before save', function (ctx, next) {
        //console.log(ctx.)
        if (ctx.isNewInstance) {
            ctx.instance.email = Date.now().toString() + '@email.com';
        }
        return next();
    });
};
