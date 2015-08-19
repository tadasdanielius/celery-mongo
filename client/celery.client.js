Meteor.startup(function() {
  CeleryTask.prototype._call_ = function(call, args) {
    var body = this._body_.apply(this,args);
    var _completed = call.completed;
    var sub_handler;

    call.completed = function(succeeded) {
      if (sub_handler) {
        sub_handler.stop();
      }
      _completed(succeeded);
    };

    // now making a call
    var response_promise = new Promise(function(resolve, reject){
      // on the server side message will be inserted into mongo collection
      // which should be picked by celery. if meteor call successfull then
      // task id is returned which is needed to monitor results collection
      Meteor.call('celery.execute.task', body, function(err, call_id){
        if (err) {
          call.completed(false);
          reject(err);
        } else {
          sub_handler = Meteor.subscribe('celery-results',[call_id]);
          call.wait(call_id).then(resolve,reject);
        }
      })
    });
    return response_promise;

  }
});
