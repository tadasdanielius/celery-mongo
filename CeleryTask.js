function delay(time) {
  return new Promise(function (fulfill) {
    setTimeout(fulfill, time);
  });
}

CeleryDelay = delay;
// holds task related info + stats
function celery_task(t) {
  var task = {
    task:t,
    args:[],
    utc: true
  };

  var timeout = 0;
  var remove = true;

  this.task = t;

  this.remove_results = function(_r) {
    if (_r === undefined) {
      return remove;
    } else {
      remove = _r;
      return this;
    }
  }

  this.reset = function(str) {
    if (str) {
      delete task[str];
    } else {
      task = {task: t,args: []};
      this.reset_stats();
    }
  }

  //If true time uses the UTC timezone, if not the current local timezone should be used.
  this.utc = function(utc) {
    if (utc === undefined) {
      return task.utc;
    }
    task.utc = utc;
    return this;
  }

  // sets timeout value in milliseconds
  // timeout is tracked locally. However it is better to use timelimit
  // to track it in celery
  this.timeout = function(t) {
    if (t != undefined) {
      timeout = t;
      return this;
    } else {
      return timeout;
    }
  }

  // Current number of times this task has been retried. Defaults to 0 if not specified.
  this.retries = function(retries) {
    if (retries === undefined) {
      return task.retries;
    }
    task.retries = retries;
    return this;
  };

  // estimated time of arrival
  this.eta = function(eta) {
    if (eta === undefined) {
      return task.eta;
    }
    task.eta = eta;
    return this;
  };

  // Dictionary of keyword arguments. Will be an empty dictionary if not provided.
  this.kwargs = function(kwargs) {
    if (kwargs === undefined) {
      return task.kwargs;
    }
    task.kwargs = kwargs;
    return this;
  }

  this.timelimit = function(timelimit) {
    if (timelimit === undefined) {
      return task.timelimit
    }
    task.timelimit = timelimit;
    return this;
  }

  // Expiration date. If not provided the message will never expire.
  // The message will be expired when the message is received and the
  // expiration date has been exceeded.
  this.expires = function(expires) {
    if (expires === undefined) {
      return task.expires;
    }
    task.expires = expires;
    return this;
  }

  // Returns plain object with required properties ready to be serialized
  this._body_ = function() {
    task.args = arguments;
    if (!(task.args instanceof Array)) {
      task.args = [];
      for (key in arguments) {
        task.args.push(arguments[key]);
      }
    }
    return task;
  }

  // returns how long it took to complete the last operation
  this.execution_time = function() {
    if (this._stats_.called_at != undefined && this._stats_.completed_at != undefined) {
      return this._stats_.completed_at - this._stats_.called_at;
    }
    return undefined;
  }

  // totali execution time. Returns total time executed. It adds up
  // if task was called more than once
  this.total_execution_time = function() {
    return this._stats_.total_execution_time;
  }

  // reset current stats
  this.reset_stats = function() {
    this._stats_ = {
      called:0,
      succeeded:0,
      failed:0,
      called_at: undefined,
      completed_at: undefined,
      total_execution_time: 0
    };
  }

  this.reset_stats();
}

CeleryTask = celery_task;
