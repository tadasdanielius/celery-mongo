function deliver_message(task) {
  task.id = Meteor.uuid();
  var message = new CeleryMessage(task);
  return message.deliver();
}

Meteor.methods({
  'celery.execute.task': function(task) {
    var permitted = CelerySecurity.Validate(task);
    if (permitted === false) {
      throw new Meteor.Error('401', 'User is not allowed to perform this operation')
    }
    var id = deliver_message(task);
    var caller = this.userId;

    // if we want to perform actions on the server side after execution of task
    // invoked from client side.
    var queryHandler = CELERY_CLIENT._CELERY_RESPONSE_.find({_id: id}).observe({
      added: function(doc) {
        queryHandler.stop();
        CeleryPostCalls.Execute(doc, task, caller);
      }
    });
    return id;
  },

  'celery.remove.results': function(task_id) {
    return CELERY_CLIENT._CELERY_RESPONSE_.remove({_id:task_id});
  }
});

Meteor.startup(function(){

  Meteor.publish('celery-results', function(call_ids){
    return CELERY_CLIENT._CELERY_RESPONSE_.find({
      _id: {
        $in: call_ids
      }
    });
  });

  CeleryTask.prototype._call_ = function(call,_args) {
    var body = this._body_.apply(this,_args);
    var call_id = deliver_message(body);
    return call.wait(call_id);
  }

});
