exports.getUniqueId = () => {
    var randomWords = require('random-words');
    return randomWords({ exactly: 3, join: '-' });
}