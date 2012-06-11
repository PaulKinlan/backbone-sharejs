(function () { /*global _: false, Backbone: false */
    if(typeof exports !== 'undefined'){
        _ = require('underscore');
        Backbone = require('Backbone');
    }

    function S4() {
      return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
  
    function guid() {
      return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    };

    var ShareStore = function(name, model) {
      this.name = name;
      this.doc;
      var self = this;
      var objs = {};
      var collection;

      this.setModelObj = function(obj) {
        if(obj instanceof Backbone.Collection) {
          collection = obj;
        }
        else {
          objs[obj.id] = obj;
        }
        return self; 
      };

      sharejs.open(name, 'json', function(error, doc) {
        self.doc = doc;

        if(self.doc.created) doc.set({});

        doc.on('change', function (op) {
          console.log("There is a change:", op);
          // It is the collection
          if(!!(op[0].oi).id == false) {
            console.log("Change collecion");
            collection.fetch();
          }
          else {
            // find the exact model to update.
            var id = op[0].oi.id;
            if(id in objs) {
              objs[op[0].oi.id].set(op[0].oi, {silent: true});
              objs[op[0].oi.id].change();
            }
            else {
              // a new item has been added.
              collection.fetch();
            }
          }
        });

        doc.on('child op', function (path, op) {
          console.log("There is a change: child", path, op);
        });
      })
    };

    _.extend(ShareStore.prototype, {
      update: function(model, callback) {
        var id = model.id;

        this.doc.at(id).set(model, callback);
      }, 
      find: function(model, callback) {
         callback(this.doc.at(model.id));
      },
      findAll: function(callback) {
        var self = this;
        var defer = function() {
          if(!!self.doc == false || self.doc.state != "open") {
            setTimeout(defer, 1000); 
          }
          else {
            callback(_.values(self.doc.get()));
          }
        };

        defer();

      },
      create: function(model, callback) {
        if(!model.id) model.id = model.attributes.id = guid();
        this.doc.at(model.id).set(model, callback);
      },
      destroy: function(model, callback) {
        var id = model.id;
        this.doc.at(model.id).remove(callback);
      }
    });

    Backbone.sync =  function(method, model, options) {
      var store = model.shareStore || model.collection.shareStore;
      var respOT = function(er, op) {
        if(!!op == false) return;

        var m = op.oi || op.od;
        if(m) options.success(m);
        else options.error("Not Found");
      };

      var respModel = function(m) {
        if(m) options.success(m);
        else options.error("Not Found");
      }; 

      switch(method) {
        case "create":
          store.create(model, respOT);
          break;
        case "read":
          if(model.id) store.find(model, respModel);
          else store.findAll(respModel);
          break
        case "delete":
          store.destroy(model, respOT);
          break;
        case "update":
          store.update(model, respOT);
          break;
      }
    }

    if(typeof exports == 'undefined'){
        window.ShareStore = ShareStore;
    }
    else {
        exports.sync = sync;
    }
})();