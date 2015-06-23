formster.js - the Formster.io Client-side Library
------------------

[Formster.io](http://formster.io) is a service to let you easily create and track sign up forms on static web pages. For more information and examples, visit [Formster.io](http://formster.io). Formster.io was previously known as Signups.io.


Installation
============

### CDN (recommended)
Formster.io maintains a CDN for the formster.js Library (built as a standalone). The format for requests to the CDN is:
`protocol://cdn.formster.io/{version}/{script}`

Simply drop a script tag in, and you're ready to go:

```html
    <script src="//cdn.formster.io/v0.3.0/formster.min.js"></script>
```


### Standalone
The formster.js library is built using [Browserify](http://browserify.org). Standalone libraries are available in `[build/](/build)`, and are exposed to the `window` object as `Formster` if no other module system is detected. Browserify uses [UMD](https://github.com/forbeslindesay/umd) to expose standalone modules.


### Browserify
To include the client-side library in your own Browserify build, just install the formster.js package through [npm](http://npmjs.org):

```javascript
    $ npm install formster.js
```


Usage
=====

### Auto Tracking
formster.js automatically scans the page for `<form>`s with a `className` of formster on `DOMReady`. Upon finding them, it instantiates the API and starts tracking. For the majority of cases, this automatic tracking is sufficient. To trigger auto tracking at a later time, call the `auto` method of the `Formster` object:

```javascript
    function callMeLater() {
      Formster.auto();
    }
```

Formster.js keeps track of which forms it is tracking, so calling `auto` multiple times will *not* result in a duplication of data.

### Manual Tracking
In some cases, more control over the form tracking process might be desirable.

#### Instantiation
`Formster` is a constructor for the API which takes the API key as its only parameter:

```javascript
    var formster = new Formster('YOUR_API_KEY');
```

#### Track Form
To track a form (including form clicks and submissions), pass the DOM element to the `trackForm` method:

```javascript
    formster.trackForm($("#my-form-id").get(0));
```

#### Page Visit
To track a visit to a page, use the `visit` method with a page name as the only paramter:

```javascript
    formster.visit("lead-form");
```

### Underlying API Library
The guts of formster.js, most users will never need to touch the underlying library. However, it is exposed on the `Formster` object as `Formster.Api`. Any changes made to the `Api` object will be used in all future instances of `Formster`.
