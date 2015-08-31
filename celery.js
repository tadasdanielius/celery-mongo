CELERY_CLIENT = {};
CELERY_CLIENT._CELERY_RESPONSE_ = new Mongo.Collection('celery-results');
CELERY_CLIENT._MESSAGES_ = new Mongo.Collection('messages');
CELERY_CLIENT.PERMISSIONS = {};

Meteor.startup(function() {
  // helper functions
  celery_taskcall = function(call) {
    var self = this;
    var queryHandler;
    var task_id;

    // sometimes it's nice to have call ref but sometimes task fits better
    // but they should point to the same object
    var task = call;

    // Available is to ensure that task is ready to run
    // if not then it will throw exception
    this.available = function() {
      // Only one call per object is allowed.
      if (task.running()) {
        throw new Error('Task already running');
      }
      return this;
    }

    var calculate_total_execution_time = function() {
      var exec_time = task.execution_time();
      if (exec_time != undefined) {
        task._stats_.total_execution_time =
        task._stats_.total_execution_time + exec_time;
      }
    };

    // called just before calling the task
    // just to track stats
    this.started = function() {
      task._start_();
      task._stats_.called++;
      task._stats_.called_at = new Date();
      return self;
    };

    // Called when either failed or succeded.
    // failed param indicates if oepration failed or timedout
    this.completed = function(succeeded) {
      if (queryHandler) {
        queryHandler.stop();
      }

      // House keeping. Getting rid of result messages
      if (task_id && task.remove_results()) {
        if (Meteor.isServer) {
          CELERY_CLIENT._CELERY_RESPONSE_.remove({_id: task_id});
        } else {
          // Just so we don't need to allow remove from collection
          Meteor.call('celery.remove.results', task_id);
        }
      }

      // prevent calling completed when task is not running
      //this can happen when call timesout but results comes later
      if (!task.running()) {
        return;
      }
      task._running_ = false;
      task._stats_.completed_at = new Date();
      if (!succeeded) {
        task._stats_.failed++;
      } else {
        task._stats_.succeeded++;
      };
      calculate_total_execution_time();
      return self;
    };

    // Promises to get a response.
    // Returns promise which should reslove once response arrives
    this.wait = function(id) {
      task_id = id;
      var promise = new Promise(function(resolve, reject){
        var added = function(doc) {
            if (queryHandler) {
                queryHandler.stop();
            }

            // if called from client let also server know when task is finished
            // no matter of outcome
            if (self._client_call === true) {

            }

          // Should have timedout already
          if (!call.running()) {
            reject('Incorrect state')
          }

          var result = JSON.parse(Utf8ArrayToStr(doc.result));

          if (doc.status === 'FAILURE') {
            self.completed(false);
            reject(result);
          } else {
            self.completed(true);
            resolve(result);
          }
        };
        // Subscribe to results collection and wait for message with task id
        queryHandler = CELERY_CLIENT._CELERY_RESPONSE_.find({_id: id}).observe({ added: added });
      });

      return promise;
    };
  };

  CeleryTask.prototype.running = function() {
    return this._running_;
  }

  CeleryTask.prototype._start_ = function() {
    this._running_ = true;
    return this;
  }

  // Common call function for client/server side
  // separate implementation for server / client is implemented in _call_ fn
  CeleryTask.prototype.call = function() {
    var args = arguments;
    var call = new celery_taskcall(this);

    // Just to make sure only one call per task object
    // throws an exception if task is running
    call.available();
    call.started();

    // fire the message to celery. _call_ implementation is different for server
    // and client. Web browser call meteor.method whilst server just inserts message
    var response_promise = this._call_(call, args);

    var wait_time = this.timeout();
    var eta = this.eta();
    var call_time = new Date();

    // if eta is given then timeout value should be adjusted
    // basically estimated_time - current_time should give the
    // value when we can expect results + add timeout value
    if (eta != undefined && eta > call_time) {
      wait_time = (eta - call_time) + this.timeout();
    }

    if (wait_time > 0) {
      var wait_promise = CeleryDelay(wait_time).then(function(){
        call.completed(false);
        throw new Error('Operation timed out');
      })
      // if timeout is given then two promises should race each other
      // the timeout and task. Which one gonna win
      return Promise.race([response_promise,wait_promise]);
    } else {
      return response_promise;
    }
  }
});
