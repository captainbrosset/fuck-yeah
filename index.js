http   = require('http')
https  = require('https')
fs     = require('fs')
url    = require('url')

req    = require('request')
server = require('node-router').getServer()
im     = require('imagemagick')

function fetch(query,cb){
  var google = 'http://ajax.googleapis.com/ajax/services/search/images?v=1.0&rsz=8&q=' + encodeURI(query)
  req({uri:google}, function (e, resp, body) {
    results = JSON.parse(body)['responseData']['results'];
    console.log("got " + results.length + " results from google for " +query)
    var result = results[0];
    for(var i = 0; i < results.length; i ++) {
      if(parseInt(results[i].width, 10) >= 500) {
        result = results[i];
        break;
      }
    }

    if(result)
      cb(result['unescapedUrl'])
    else
      cb("https://img.skitch.com/20110825-ewsegnrsen2ry6nakd7cw2ed1m.png")
  });
}

function download(match, output, addText){
  fetch(match, function(file){
    var uri  = url.parse(file)
      , host = uri.hostname
      , path = uri.pathname

    if(uri.protocol == "https:")
      var r = https
    else
      var r = http

    request = r.get({host: host, path: path}, function(res){
      res.setEncoding('binary')
      var img = ''

      res.on('data', function(chunk) {
        img += chunk
      })

      res.on('end', function(){
        console.log("file downloaded, saving to disk " + output)
        fs.writeFile(output, img, 'binary', function (err) {
          if (err) throw err
        })
        addText();
      })
    })
  })
}

server.get("/", function(request, response){
  response.simpleHtml(200, 'fuck yeah.'+
    '<p>api: use <b>/[your-query]</b> and shit.</p>'
  );
})

server.get("/favicon.ico", function(request, response){
  return ""
})

server.get(new RegExp("/([^\.]*)(\.[a-zA-Z]+)?"), function(request, response, match, extension) {
  var msg   = ""
    , match = escape(match)
    , chars = match.length
    , extension = extension || ".jpg";

  console.log("searching for " + match + "(extension " + extension + ")"); 

  if(chars < 7)
    msg = 'FUCK YEAH ' + match.toUpperCase() + ''
  else
    msg = 'FUCK YEAH \n' + match.toUpperCase() + ''

  var output = "/tmp/fuck-" + Math.floor(Math.random(10000000)*10000000) + extension;
  download(match, output, function(){
    im.identify(output,function(err,features){
      if (err) {
        console.log(err)
        response.simpleHtml(200, err);
        return;
      }
      var h = features.height < 100 ? features.height : 100
        , w = features.width * 4 / 5 // < 500 ? features.width : 500
        , args = [
            '-background','black',
            '-fill','white',
            '-gravity','center',
            '-size',(w)+'x'+(h),
            "caption:"+unescape(msg),
            output,
            '+swap',
            '-gravity','south',
            '-size',w+'x',
            '-composite',output
          ];
      im.convert(args, function(){
        fs.readFile(output, function (err, data) {
          if (err) throw err;
          response.writeHead(200, {'Content-Type': 'image/jpeg' })
          response.end(data)
        });
      });
    });
  })
})

server.listen(process.env.PORT || 8080, '0.0.0.0')
