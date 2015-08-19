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
    return deliver_message(task);
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
