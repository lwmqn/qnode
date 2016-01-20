function u(a, b) {
        console.log(a);
        console.log(b);
}

function x() { 
    process.nextTick(u, 'hi', 'simen');
}

setTimeout(function () {
    console.log('fired');
    x();
    //var t = new Date();
    console.log((new Date()).getTime());
}, 3000);
var b = new Buffer([1]);
console.log(typeof b === 'object');