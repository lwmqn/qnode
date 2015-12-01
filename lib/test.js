function X () {
    this.name = 'Mr. X';
    // this.getName = getName.bind(this);
    this.getName = function () {

        return getName.bind(this)();
    };
}

function getName() {
    console.log(this.name);
}

var x = new X();
x.getName();