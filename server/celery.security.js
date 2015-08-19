// Some parts of the code/idea were taken from package ongoworks:security
// https://github.com/ongoworks/meteor-security/
// So credit goes to the person who wrote it
CelerySecurity = {
  RestrictionChain: function() {
    return new function() {
      var self = this;
      var chain = [];
      this.add = function(rule) {
        chain.push(rule);
      },
      this.validate = function(task) {
        // by default it is allowed
        var allowed = true;
        for (var i = 0; i<chain.length;i++) {
          var rule = chain[i];
          var arg = rule.args;
          arg.task = task;

          if (rule.definition(arg) == true) {
            allowed = false;
            break;
          }
        }
        return allowed;
      };
    }
  },
  Rule: function SecurityRuleConstructor(tasks) {
    var self = this;
    self.restrictions = [];

    if (!(tasks instanceof Array)) {
      tasks = [tasks];
    }

    tasks.forEach(function(task){
      // either reuse existing or create new one
      var restriction = CelerySecurity.Rules[task] || CelerySecurity.RestrictionChain();
      CelerySecurity.Rules[task] = restriction;
      self.restrictions.push(restriction);
    });

    self._tasks = tasks;
  },
  Validate: function(taskBody) {
    var restructions = CelerySecurity.Rules[taskBody.task];

    // by default it is allowed
    return restructions ? restructions.validate(taskBody) : true;
  },
  // the starting point of the chain
  permit: function permit(tasks) {
    return new CelerySecurity.Rule(tasks);
  },
  defineMethod: function securityDefineMethod(name, definition) {
    // Check whether a rule with the given name already exists; can't overwrite
    if (CelerySecurity.Rule.prototype[name]) {
      throw new Error('A security method with the name "' + name + '" has already been defined');
    }
  CelerySecurity.Rule.prototype[name] = function (arg) {
    var self = this;
    self.restrictions.forEach(function(r){
      r.add({
        definition: definition,
        args: {
          supplied:arg
        }
      })
    });
    return self;
  };
},
Rules: {}
};

CelerySecurity.defineMethod('never', function() {
  return true;
});

CelerySecurity.defineMethod('echo',function(arg){
  console.log(arg);
  return false;
});
CelerySecurity.defineMethod('logged',function(arg){
  // deny if userId is not set
  return Meteor.userId() == undefined;
});

CelerySecurity.defineMethod('logged_userid',function(arg){
  // deny if userId does not match with the given one during rule creation
  return Meteor.userId() != arg.supplied;
});
