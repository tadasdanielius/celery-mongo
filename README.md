tadas:celery-mongo
=====================

Meteor package that provides integration with Python Celery distributed task queue using MongoDB collections. It supports security control mechanisms, postcalls, client side timeouts mechanisms. Note, It is in alpha stage and things may change.

# Installation

```bash
$ meteor add tadas:celery-mongo
```

## Setting up celery

Before using meteor package celery server must be set up to use mongodb. Here is simple example how this can be acheaved. First create file

**celeryconfig.py**

```python
CELERY_RESULT_BACKEND = 'mongodb://localhost:3001/'
CELERY_MONGODB_BACKEND_SETTINGS = {
    'database': 'meteor',
    'taskmeta_collection': 'celery-results',
}

CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT=['json']
```

Create simple task in file **tasks.py**

```python
from celery import Celery
import time


BROKER_URL = 'mongodb://localhost:3001/meteor'
app = Celery('tasks', broker=BROKER_URL)

app.config_from_object('celeryconfig')

@app.task
def add(x,y,delay):
    if delay < 0:
        raise Exception('Sleep cannot be less than 0')

    # For testing reasons add some delay
    time.sleep(delay)
    return x + y
```

## Meteor

Once celery is up and running tasks can be invoked by creating ***CeleryTask*** object and calling ***call(args)*** function. Which returns [promise](https://www.promisejs.org/

### Client

```js
var completed = function(result) {
  console.log('Completed successfully',result);
}

var failed = function(_err) {
  console.log('Failed',_err)
}

var task = new CeleryTask('tasks.add');
task.call(20,30,3).then(completed,failed);
```

That's all. You can also you **timeout** function

```js
/// 3000 milliseconds
task.timeout(3000).call(20,30,1).then(completed,failed);
```

### Server

You can also run the same code on server.

## Security

By default users can execute every task but if needed restrictions can be defined server side. Please note, security restrictions are only tested when task is executed from the browser.

```js
// only logged user
CelerySecurity.permit('tasks.add').logged();

// only user with id
CelerySecurity.permit('tasks.divide').logged_userid(id);

// forbid
CelerySecurity.permit('tasks.secret_method').never();

// can also take array
CelerySecurity.permit(['tasks.task1','tasks.tas2']).logged();
```

Additional rules can be easily implemented, for example to forbid everything

```js
// defineMethod takes rule name and function which should return true if
// you want to forbid or false if you want to allow
CelerySecurity.defineMethod('my_rule',function(args){
  // arg contains all details about the task and supplied arguments when
  // calling defining security
  console.log(arg);
  // forbid everything
  return true;
});

// And then you can use
CelerySecurity.permit('tasks.my_task').my_rule(user_name)
```

## Post Calls

Post calls are the way to do post processing on server side after task has been completed, if needed any. Post calls are fired only when method is invoked from the browser, so server can do additional processing, i.e. calculating stats and inserting into collection. If task is executed from the meteor server just use returned [promise](https://www.promisejs.org/)

Post calls can be defined/registered server side

```js
CeleryPostCalls.defineMethod('my_post_call', function(arg){
  // do something e.g. insert usage stats
  console.log('Method completed', arg);
});

CeleryPostCalls.postcalls('tasks.ping').my_post_call();
```


## API

CeleryTask:

* **timeout(milliseconds)** - will wait for response only for given time in milliseconds. This is done in meteor not in celery. Default is 0 - that means will wait forever
* **remove_results(bool)** - if set to true after completion results will be removed from mongdb. It is a good practice to remove them since we dont need to keep old records. Default is true.
* **reset(prop)** - If prop is given then it will clear existing setting of that property. Otherwise will reset everything to default values.
* **utc(bool)** - If true time uses the UTC timezone, if not the current local timezone should be used
* **retries(num)** - Celery property - Current number of times this task has been retried. Defaults to 0 if not specified. This data is sent to server
* **eta(date)** - Celery property - Estimated time of arrival.
* **kwargs(obj)** -
Dictionary of keyword arguments. Will be an empty dictionary if not provided.
* **expires(date)** - Expiration date. If not provided the message will never expire The message will be expired when the message is received and the expration date has been exceeded.

More details about each property can be found on [celery documentation](https://celery.readthedocs.org/en/latest/internals/protocol.html)


You can chain properties

```js
var task = new CeleryTask('tasks.my_task');
task.eta(new Date()).remove_results(false).timeout(10000).call(arg1,arg2,arg3).then(function(result) {
  // completed
}, function(err) {
  // failed
})
```



* **execution_time()** how long it took to complete last call
* **total_execution_time()** if you call that task more than once you check how long it took for all tasks to complete

  Also you can access other details like start/completed times or how many times succeeded or failed **task._stats_**

### Call method

This is main method to start the tasks. Call method can take any number of parameters which will be passed to celery. Please note that only one request at a time can be called. I.e. you cant just call many times without waiting last call to complete. If you want to call more than once at the same time you have to create new instances:

```js
var task1 = new CeleryTask('tasks.my_task');
var task2 = new CeleryTask('tasks.my_task');

task1.call(1,2,3);
task2.call(3,4,5);
```

# Change log

## from 0.0.2 to 0.0.3

Added server side postcalls when task is invoked client side

# License

MIT
