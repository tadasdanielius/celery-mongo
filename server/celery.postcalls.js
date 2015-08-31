CeleryPostCalls = {
  ExecutionChain: function() {
    return new function() {
      var self = this;
      var chain = [];
      this.add = function(fn) {
        chain.push(fn);
      };
      this.execute = function(result, task, userId) {
        for (var i = 0; i<chain.length; i++) {
          var fn = chain[i];
          var arg = fn.args;
          arg.task = task;
          arg.result = result;
          arg.caller = userId;
          fn.definition(arg);
        }
      };
    }
  },
  Func: function PostCallFn(tasks) {
    var self = this;
    self.fn_chain = [];
    if (!(tasks instanceof Array)) {
      tasks = [tasks];
    }

    tasks.forEach(function(task){
      var fn = CeleryPostCalls.Chain[task] || CeleryPostCalls.ExecutionChain();
      CeleryPostCalls.Chain[task] = fn;
      self.fn_chain.push(fn);
    });

    self._tasks = tasks;
  },
  postcalls: function postcalls(tasks) {
    return new CeleryPostCalls.Func(tasks);
  },
  Execute: function(doc, taskBody, userId) {
    var chain = CeleryPostCalls.Chain[taskBody.task];
    if (chain) {
      var resp = JSON.parse(Utf8ArrayToStr(doc.result));
      chain.execute(resp, taskBody, userId);
    }
  },
  defineMethod: function executionDefineMethod(name, definition) {
    if (CeleryPostCalls.Func.prototype[name]) {
      throw new Error('A execution function with the name "'+ name + '" has already been defined"');
    }

    CeleryPostCalls.Func.prototype[name] = function(arg) {
      var self = this;
      self.fn_chain.forEach(function(r){
        r.add({
          definition: definition,
          args: {
            supplied: arg
          }
        })
      });
      return self;
    }
  },
  Chain: {}
};

CeleryPostCalls.defineMethod('echo', function(arg){
  console.log(arg);
});
