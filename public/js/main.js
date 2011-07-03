(function($) {

  var Renderer = function(canvas) {
    var canvas = $(canvas).get(0)
    var ctx = canvas.getContext('2d');
    var win = $(window)
    var particleSystem

    var that = {
      init: function(system) {
        //
        // the particle system will call the init function once, right before the
        // first frame is to be drawn. it's a good place to set up the canvas and
        // to pass the canvas size to the particle system
        //
        // save a reference to the particle system for use in the .redraw() loop
        particleSystem = system

        win.resize(that.resize)
        that.resize()

        // set up some event handlers to allow for node-dragging
        that.initMouseHandling()
      },

      // XXX why doesn't this fill the screen?
      resize: function() {
        canvas.width = win.width() - 160
        canvas.height = .75 * win.height() - 160
        particleSystem.screenSize(canvas.width, canvas.height)
        particleSystem.screenPadding(80) // leave an extra 80px of whitespace per side
        that.redraw()
      },

      redraw: function() {
        if (!particleSystem) return

        // 
        // redraw will be called repeatedly during the run whenever the node positions
        // change. the new positions for the nodes can be accessed by looking at the
        // .p attribute of a given node. however the p.x & p.y values are in the coordinates
        // of the particle system rather than the screen. you can either map them to
        // the screen yourself, or use the convenience iterators .eachNode (and .eachEdge)
        // which allow you to step through the actual node objects but also pass an
        // x,y point in the screen's coordinate system
        // 
        ctx.fillStyle = "white"
        ctx.fillRect(0,0, canvas.width, canvas.height)
        
        particleSystem.eachEdge(function(edge, pt1, pt2) {
          // edge: {source:Node, target:Node, length:#, data:{}}
          // pt1:  {x:#, y:#}  source position in screen coords
          // pt2:  {x:#, y:#}  target position in screen coords

          // draw a line from pt1 to pt2
          ctx.strokeStyle = edge.data.color || '#444'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(pt1.x, pt1.y)
          ctx.lineTo(pt2.x, pt2.y)
          ctx.stroke()
        })

        particleSystem.eachNode(function(node, pt) {
          // node: {mass:#, p:{x,y}, name:"", data:{}}
          // pt:   {x:#, y:#}  node position in screen coords

          // draw a rectangle centered at pt
          var w = 10
          ctx.fillStyle = node.data.color || 'black'
          ctx.fillRect(pt.x-w/2, pt.y-w/2, w,w)
          
          ctx.font = "14pt Helvetica"
          ctx.fillText(node.data.type + ' ' + node.data.name, pt.x + w, pt.y)
          if (node.data.extra) {
            ctx.fillText(node.data.extra, pt.x + w, pt.y + 15)
          }
        })    			
      },
      
      initMouseHandling: function() {
        // no-nonsense drag and drop (thanks springy.js)
        var dragged = null;

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
          clicked: function(e) {
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            dragged = particleSystem.nearest(_mouseP);

            if (dragged && dragged.node !== null) {
              console.log('clicked ' + dragged.node.name)
              // while we're dragging, don't let physics move the node
              dragged.node.fixed = true
            }

            $(canvas).bind('mousemove', handler.dragged)
            win.bind('mouseup', handler.dropped)

            return false
          },
          dragged: function(e) {
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

            if (dragged && dragged.node !== null) {
              var p = particleSystem.fromScreen(s)
              dragged.node.p = p
            }

            return false
          },

          dropped: function(e) {
            if (dragged === null || dragged.node === undefined) return
            if (dragged.node !== null) dragged.node.fixed = false
            dragged.node.tempMass = 1000
            dragged = null
            $(canvas).unbind('mousemove', handler.dragged)
            win.unbind('mouseup', handler.dropped)
            _mouseP = null
            return false
          }
        }
        
        // start listening
        $(canvas).mousedown(handler.clicked);

      },
      
    }
    return that
  }    

  var lastLinks = {} // maps deferred IDs to the last link of their chain
    , EventHandlers =
      { 'datasource-created': function(sys, ev) {
          sys.addNode(ev.id, { mass: 20.0, fixed: true, color: 'goldenrod', type: ev.data.class || 'data source', name: ev.id })
        }
      , 'datasource-removed': function(sys, ev) {
          sys.getNode(ev.id).data.extra = '(complete)'
        }
      , 'datasource-cancelled': function(sys, ev) {
          sys.getNode(ev.id).data.color = 'yellow'
        }
      , 'datasource-executed': function(sys, ev) {
          sys.getNode(ev.id).data.color = '#005'
        }
      , 'datasource-completed': function(sys, ev) {
          var node = sys.getNode(ev.id)
          node.data.color = '#050'
          node.data.extra = ev.data.result
        }

      , 'deferred-created': function(sys, ev) {
          sys.addNode(ev.id, { mass: 10.0, type: ev.data.class || 'deferred', name: ev.id })
          lastLinks[ev.id] = ev.id
          console.log('deferred-created: data source id is ', ev.data.dataSourceId, 'ev.id = ', ev.id)
          if (ev.data.dataSourceId) {
            sys.addEdge(ev.data.dataSourceId, ev.id)
          }
        }
      , 'deferred-removed': function(sys, ev) {
          // delete lastLinks[ev.id]
          // if (ev.data && ev.data.dataSourceId) {
          //   sys.pruneEdge(sys.getEdge(ev.data.dataSourceId, ev.id))
          // }
          // else {
          //   sys.pruneNode(ev.id)
          // }
        }
      , 'deferred-cancelled': function(sys, ev) {
          sys.getNode(ev.id).data.color = 'yellow'
        }
      , 'deferred-resolved': function(sys, ev) {
          var node = sys.getNode(ev.id)
          node.data.color = '#050'
          node.data.extra = '(complete: ' + ev.data.result + ')'
        }
      , 'deferred-rejected': function(sys, ev) {
          var node = sys.getNode(ev.id)
          node.data.color = '#500'
          node.data.extra = '(complete: ' + ev.data.result + ')'
        }
      , 'deferred-paused': function(sys, ev) {
          sys.getNode(ev.id).data.extra = '(paused)'
          if (ev.data.distantLink) {
            sys.addEdge(ev.data.distantLink, ev.data.myLink, { color: '#FF510C' })
          }
        }
      , 'deferred-unpaused': function(sys, ev) {
          delete sys.getNode(ev.id).data.extra
        }
      , 'deferred-link-added': function(sys, ev) {
          var data = { mass: 5.0, name: ev.data.linkId, extra: ev.data.file + ':' + ev.data.line }
          if (ev.data.finalizer) {
            data.type = 'finalizer'
            data.color = '#744'
            sys.addNode(ev.data.linkId, data)
            sys.addEdge(ev.id, ev.data.linkId)
          }
          else {
            data.type = 'link'
            data.color = '#666'
            sys.addNode(ev.data.linkId, data)
            sys.addEdge(lastLinks[ev.id], ev.data.linkId)
            lastLinks[ev.id] = ev.data.linkId
          }
        }
      , 'deferred-link-ran': function(sys, ev) {
          var node = sys.getNode(ev.data.linkId)
          node.data.color = '#999'
          node.data.extra += '\n' + ev.data.result
        }
      }

  $(document).ready(function() {
    var sys = arbor.ParticleSystem(50, 1, 0.9) // create the system with sensible repulsion/stiffness/friction
    sys.parameters({ gravity: false }) // use center-gravity to make the graph settle nicely (ymmv)
    sys.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...

    var events = []
      , deferreds = {}
    var socket = io.connect('http://localhost')
    socket.on('event', function (ev) {
      events.push(ev)
      console.log('"' + ev.name + '"', '"' + ev.id + '"', ev.payload)
      if (ev.payload && ev.payload !== '(null)') {
        try {
          ev.data = JSON.parse(ev.payload)
        }
        catch (e) {
          console.warn('payload is not JSON: ', ev.payload)
        }
      }
      var handler = EventHandlers[ev.name]
      if (typeof handler === 'function') {
        handler(sys, ev)
        sys.renderer.redraw()
      }
      else {
        console.error('no handler for ' + ev.name)
      }
    })    
  })

})(this.jQuery)
