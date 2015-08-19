
CeleryTaskPayload = function(task) {
  var payload = {};
  payload.body = new Buffer(JSON.stringify(task)).toString('base64');
  payload['content-encoding'] = 'utf-8';
  payload['content-type'] = 'application/json';
  payload.headers = {};
  payload.properties = {
    body_encoding: 'base64',
    correlation_id: task.id,
    delivery_info: {
      exchange: 'celery',
      priority: 0,
      routing_key: 'celery'
    },
    delivery_mode: 2,
    delivery_tag: Meteor.uuid(),
    reply_to: Meteor.uuid()
  };

  this.payload = payload;
  this.get = function() {
    return payload;
  };

  this.stringify = function() {
    return JSON.stringify(payload);
  }

  this.getTask = function() {
    return task;
  }
  this.getTaskId = function() {
    return task.id;
  }

}

CeleryMessage = function (taskMessage) {

  var payload = new CeleryTaskPayload(taskMessage);
  var message = {
    queue: 'celery',
    payload: payload.stringify()
  };
  this.deliver = function() {
    // send all the data to MongoDB and celery should pick it
    CELERY_CLIENT._MESSAGES_.insert(message);
    return payload.getTaskId();
  }
};
