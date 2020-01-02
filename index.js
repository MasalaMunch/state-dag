"use strict";

const assert = require(`assert`);

const IsNully = require(`is-nil`);

const defIn = require(`@masalamunch/def-in`);

module.exports = () => {

    const nameInterfaces = {};
    const nameVals = {};
    const nameUpdateFns = {};
    const nameOutputNames = {};
    const rootNames = [];

    const this_ = {

        def: (obj) => {

            assert(obj instanceof Object);

            Object.keys(obj).forEach((name) => {

                assert(!this_.hasOwnProperty(name));

                assert(obj[name] instanceof Object);

                const {val, inputNames, update} = obj[name];

                if (inputNames) {
                    assert(inputNames instanceof Array);
                    inputNames.forEach((otherName) => 
                        assert(nameInterfaces.hasOwnProperty(otherName)));
                }

                if (update || (inputNames && inputNames.length > 0)) {
                    assert(update instanceof Function);
                }

                Object.defineProperty(this_, name, {
                    get: () => nameInterfaces[name],
                    set: () => assert(false), // mutation must happen via this_[name].val
                    });

                nameInterfaces[name] = obj[name];

                delete this_[name].inputNames;
                delete this_[name].update;

                Object.defineProperty(this_[name], "val", {
                    get: () => nameVals[name], 
                    set: (newVal) => {
                        if (!nameVals.hasOwnProperty(name) || 
                        nameVals[name] !== newVal) {
                            nameVals[name] = newVal;
                            nameOutputNames[name].forEach((otherName) => 
                                nameUpdateFns[otherName]());
                        }
                    },
                    });

                nameOutputNames[name] = [];

                this_[name].val = val;

                if (inputNames && inputNames.length > 0) {
                    inputNames.forEach((otherName) => 
                        nameOutputNames[otherName].push(name));
                }
                else {
                    rootNames.push(name);
                }

                nameUpdateFns[name] = update? update : () => {};

            });

        },

        update: () => rootNames.forEach((name) => nameUpdateFns[name]()), 

        defEvents: (obj) => {

            assert(obj instanceof Object);

            Object.keys(obj).forEach((name) => {
                defIn(obj[name], {
                    val: 0,
                    log: () => ++this_[name].val,
                    });
            });

            this_.def(obj);
        
        },

        defTasks: (obj) => {

            assert(obj instanceof Object);            

            Object.keys(obj).forEach((name) => {

                assert(!IsNully(obj[name]));

                const {prereqNames, do} = obj[name];

                if (do) {
                    assert(do instanceof Function);
                }

                defIn(obj[name], {
                    inputNames: prereqNames,
                    update: async () => {
                        if (!prereqNames || prereqNames.filter((otherName) => 
                        this_[otherName].val !== "finished").length === 0) {
                            if (do) {
                                await do();
                            }
                            this_[name].val = "finished";
                        }
                    },
                    });

                delete obj[name].prereqNames;
                delete obj[name].do;

            });

            this_.def(obj);

        }, 

        };

    return this_;

};