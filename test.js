var _ = require('lodash');


// var x = {
//     _pubics: {},
//     _subics: {}
// };

// _.forEach([ 'register', 'deregister', 'notify', 'update', 'ping' ], function (intf) {
//     x._pubics[intf] = intf + '/' + 'clientId';
//     x._subics[intf] = intf + '/response/' + 'clientId';
// });
//     x._pubics.response = 'response/' + 'clientId';
//     x._subics.request = 'request/' + 'clientId';
//     x._subics.announce = 'announce';

// console.log(x);

// var subTopics = _.map(x._subics, function (t) {
//             return t;
//         });

// console.log(subTopics);

console.log(_.isEmpty({}));