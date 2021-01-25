# css img manipulation

This is a small library I wrote to manipulate images using css.
My use-case for this was processing images with instagram filters, which I had found [css versions](https://una.im/CSSgram/) of.

### dependencies
- Google Chrome
- ImageMagick

### install
```bash
npm install -g css-img-manipulation
```

### usage
```bash
cd src/
# start headless chrome
google-chrome --headless --hide-scrollbars --remote-debugging-port=9222 --disable-gpu &
pid=$(echo $!)
# manipulate an image using a css filter
node ./index.js --css ./example/clarendon.css --cls clarendon --img ./example/cacti.jpg --out ./example/cacti-clarendon.jpg
# optionally recompress to adress added bloat
magick convert -quality 90% ./example/cacti-clarendon.jpg ./example/cacti-clarendon-compressed.jpg
# kill headless chrome
kill $pid
```
