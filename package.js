Package.describe({
  name: 'tadas:celery-mongo',
  version: '0.0.2',
  // Brief, one-line summary of the package.
  summary: 'Meteor integration with Celery distributed task queue',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/tadasdanielius/celery-mongo',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.3');
  api.use(['promise@0.4.1']);
  api.use(['mongo']);
  api.use( 'livedata', [ 'server' ] ) ;

  api.addFiles('celery.js');
  api.addFiles('CeleryTask.js');
  api.addFiles('util.js');

  api.addFiles('client/celery.client.js',['client']);

  api.addFiles(['server/celery.message.js',
               'server/celery.security.js',
               'server/celery.server.js'],['server']);

  api.export(['CeleryTask','CelerySecurity','CeleryTask']);
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('tadas:celery-mongo');
  api.addFiles('celery-mongo-tests.js');
});
