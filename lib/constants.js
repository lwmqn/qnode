'use strict';

module.exports = {
    REQ_TIMEOUT: 10000,
    TTYPE: {
        root: 0,
        obj: 1,
        inst: 2,
        rsc: 3
    },
    CMD: {
        read: 0,
        write: 1,
        discover: 2,
        writeAttrs: 3,
        execute: 4,
        observe: 5,
        notify: 6,
        ping: 7
    },
    CMDNAMES: [
        'read', 'write', 'discover', 'writeAttrs', 'execute', 'observe', 'notify', 'ping', 'identify'
    ],
    TAG: {
        notfound: '_notfound_',
        unreadable: '_unreadable_',
        exec: '_exec_',
        unwritable: '_unwritable_',
        unexecutable: '_unexecutable_'
    },
    ERR: {
        success: 0,
        notfound: 1,
        unreadable: 2,
        unwritable: 3,
        unexecutable: 4,
        timeout: 5,
        badtype: 6
    },
    RSP: {
        ok: 200,
        created: 201,
        deleted: 202,
        changed: 204,
        content: 205,
        badreq: 400,
        unauth: 401,
        notfound: 404,
        notallowed: 405,
        timeout: 408,
        conflict: 409,
        inerr: 500
    }
};
