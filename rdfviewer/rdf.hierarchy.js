$.extend({
  getUrlVars: function(){
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    return vars;
  },
  getUrlVar: function(name){
    return $.getUrlVars()[name];
  }
});

function polygonIntersect(c, d, a, b) {
  var x1 = c[0], x2 = d[0], x3 = a[0], x4 = b[0],
      y1 = c[1], y2 = d[1], y3 = a[1], y4 = b[1],
      x13 = x1 - x3,
      x21 = x2 - x1,
      x43 = x4 - x3,
      y13 = y1 - y3,
      y21 = y2 - y1,
      y43 = y4 - y3,
      ua = (x43 * y13 - y43 * x13) / (y43 * x21 - x43 * y21);
  return [x1 + ua * x21, y1 + ua * y21];
}

function pointInBox(rect, b) {
    return b.x > rect.x && b.x < rect.x + rect.width &&
        b.y > rect.y && b.y < rect.y + rect.height;
}

function pointInLine(a,c,d) {
    return a[0] >= Math.min(c[0],d[0]) &&
        a[0] <= Math.max(c[0],d[0]) &&
        a[1] >= Math.min(c[1],d[1]) &&
        a[1] <= Math.max(c[1],d[1]);
}

function edgePoint(rect, a, b) {
    comparePoint = a
    if (pointInBox(rect,b))
        comparePoint = b;
    
    lines = [[[rect.x,rect.y], // top horizontal
              [rect.x+rect.width,rect.y]],
             [[rect.x,rect.y+rect.height], // bottom horizontal
              [rect.x+rect.width,rect.y+rect.height]],
             [[rect.x,rect.y], // left vertical
              [rect.x,rect.y+rect.height]],
             [[rect.x+rect.width,rect.y], // right vertical
              [rect.x+rect.width,rect.y+rect.height]]];
    intersects = lines.map(function(x) {
        return polygonIntersect(x[0],x[1],a,b);
    });
    if (pointInLine(intersects[0],a,b)  && 
        intersects[0][0] >= rect.x &&
        intersects[0][0] <= rect.x + rect.width) {
        return intersects[0];
    } else if (pointInLine(intersects[1],a,b) && 
               intersects[1][0] >= rect.x &&
               intersects[1][0] <= rect.x + rect.width) {
        return intersects[1];
    } else if (pointInLine(intersects[2],a,b) && 
               intersects[2][1] >= rect.y &&
               intersects[2][1] <= rect.y + rect.height) {
        return intersects[2];
    } else if (pointInLine(intersects[3],a,b) && 
               intersects[3][1] >= rect.y &&
               intersects[3][1] <= rect.y + rect.height) {
        return intersects[3];
    } else return null;
}

function makeCenteredBox(node) {
    var box = {};
    box.x = node.x - node.width / 2;
    box.y = node.y - node.height / 2;
    box.width = node.width;
    box.height = node.height;
    return box;
}

function getLabel(r) {
    if (d.label == " ")
        return '<img src="RDFicon.png" width="12" height="12"/>&nbsp;';
    else return d.label; 
}


function viewrdf(element, w, h, url,nodeWidth) {

var vis = d3.select(element)
    .append("svg:svg")
    .attr("width", w)
    .attr("height", h);

//var toLoad = "http://sparql.tw.rpi.edu/swbig/endpoints/http://hints2005.westat.com:8080/wsrf/services/cagrid/Hints2005/gov.nih.nci.dccps.hints2005.domain.TobaccoUse/1";
//var toLoad = "http://www.cs.rpi.edu/~hendler/foaf.rdf"
//var toLoad = "http://tw.rpi.edu/web/person/JimHendler"
//var toLoad = "http://purl.org/twc/cabig/endpoints/http://array.nci.nih.gov:80/wsrf/services/cagrid/CaArraySvc/gov.nih.nci.caarray.domain.project.Experiment/453"
//var toLoad = 'http://purl.org/twc/cabig/endpoints/http://hints2005.westat.com:8080/wsrf/services/cagrid/Hints2005/gov.nih.nci.dccps.hints2005.domain.HealthInformationNationalTrendsSurvey/1';
//var toLoad = 'http://tw.rpi.edu/web/person/JamesMcCusker';
//var toLoad = 'http://localhost/~jpm78/derivation.ttl';
//var toLoad = 'http://localhost/~jpm78/4210962_Processor_for_dynamic_programmin.pdf.prov.prov-only.ttl';
//var url = 'http://localhost/~jpm78/4210962_Processor_for_dynamic_programmin.pdf.prov.ttl';
//console.log(url.value);

var kb = $.rdf.databank()
    .prefix('owl', 'http://www.w3.org/2002/07/owl#')
    .add('<'+url+'> a owl:Thing .');
data = $.ajax({
    beforeSend: function(req) {
        req.setRequestHeader("Accept", "application/json");
    },
    type: 'POST',
    url: 'http://localhost:8080/sadi/services/rdfviewer/get',
    processData: false,
    contentType: 'application/rdf+xml',
    async: true,
    data: kb.dump({format:'application/rdf+xml', 
                            serialize: true}),
    complete: finish
});


function finish(data) {
    d = $.parseJSON(data.responseText);
    resources = {};
    var nodes = [];
    var edges = [];
    var predicates = [];
    var entities = [];
    
    function makeLink(source, target,arrow) {
        link = {};
        link.source = source;
        link.target = target;
        link.value = 1;
        link.display = true;
        link.arrow = arrow;
        edges.push(link);
        return link;
    }

    function getSP(s, p) {
        var result = resources[s.uri+' '+p.uri];
        if (result == null) {
            result = {};
            result.width = 0;
            result.type = 'predicate';
            result.display = true;
            result.subject = s;
            result.predicate = p;
            result.objects = [];
            result.uri = s.uri+' '+p.uri;
            result.isPredicate = false;
            resources[result.uri] = result;
            link = makeLink(s,result,false);
            result.links = [];
            result.links.push(link);
        }
        return result;
    }

    function getResource(uri) {
        var result = resources[uri];
        if (result == null) {
            result = {};
            result.width = 0;
            result.type = 'resource';
            result.types = [];
            result.display = false;
            result.attribs = {};
            result.relations = {};
            result.objectOf = [];
            result.uri = uri;
            result.label = uri;
            result.label = result.label.split("#");
            result.label = result.label[result.label.length-1];
            result.label = result.label.split("/");
            result.label = result.label[result.label.length-1];
            if (result.label == '') {
                result.label = ' ';
            }
            result.isPredicate = false;
            resources[uri] = result;
        }
        return result;
    }

    d3.entries(d).forEach(function(subj) {
        d3.entries(subj.value).forEach(function(pred) {
            pred.value.forEach(function(obj) {
                var resource = getResource(subj.key);
                resource.display = true;
                var predicate = getResource(pred.key);
                predicate.isPredicate = true;
                if (obj.type == "literal") {
                    if (pred.key == "http://www.w3.org/2000/01/rdf-schema#label") {
                        resource.label = obj.value;
                    } else {
                        //console.log(resource);
                        //console.log(predicate);
                        //console.log(obj.value);
                        if (resource.attribs[predicate.uri] == null) {
                            resource.attribs[predicate.uri] = [];
                        }
                        resource.attribs[predicate.uri].push(obj.value);
                    }
                } else if (pred.key == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                    resource.types.push(getResource(obj.value));
                } else {
                    sp = getSP(resource, predicate);
                    o = getResource(obj.value);
                    sp.objects.push(o);
                    o.display = true;
                    o.objectOf.push(sp);
                    sp.links.push(makeLink(sp,o,true));
                    if (resource.relations[predicate.uri] == null) {
                        resource.relations[predicate.uri] = [];
                    }
                    resource.relations[predicate.uri].push(o);
                }
            })
        })
    });
    
    d3.values(resources).filter(function(resource){
        var result = resource.type == "predicate";
        if (result) {
            result = resource.objects.reduce(function(prev,o) {
                //console.log(o);
                //console.log(o.uri);
                //console.log(d3.keys(o.attribs));
                //console.log(d3.keys(o.relations));
                return d3.keys(o.attribs).length == 0 &&
                    d3.keys(o.relations).length == 0 &&
                    d3.keys(o.objectOf).length == 1 && prev;
            },result);
        }
        return result;
    }).forEach(function(resource) {
        resource.subject.attribs[resource.predicate.uri] = resource.objects;
        //console.log(resource);
        resource.display = false;
        resource.objects.forEach(function(o) {
            o.display = false;
        });
        resource.links.forEach(function(l) {
            l.display = false;
        });
    });

    nodes = d3.values(resources).filter(function(node) {
        return (!node.isPredicate && node.display);
    });
    
    entities = d3.values(resources).filter(function(node) {
        return (node.type == 'resource' && !node.isPredicate && node.display);
    });

    predicates = d3.values(resources).filter(function(node) {
        return (node.type == 'predicate' && !node.isPredicate && node.display);
    });

    edges = d3.values(edges).filter(function(l) {
        return l.display;
    });

    var force = d3.layout.force()
        .charge(-500)
        .linkStrength(0.1)
        .linkDistance(function(d){
            console.log(d);
            width = d.source.width + d.target.width + 50;
            console.log(width);
            return width;
        })
        //.linkDistance(75)
        .gravity(0.01)
        .nodes(nodes)
        .links(edges)
        .size([w, h]);
    
    var link = vis.selectAll("line.link")
        .data(edges)
        .enter().append("svg:g").attr("class", "link")
        .call(force.drag);

    link.append("svg:line")
        .attr("class", "link")
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
    
    //var linkText = link.append("svg:text")
    //    .attr("class","link")
    //    .attr("text-anchor","middle")
    //    .attr("x", function(d) { return (d.source.x+d.target.x)/2; })
    //    .attr("y", function(d) { return (d.source.y+d.target.y)/2+12; })
    //    .text(function(d){return d.predicate.label;})
    //    .attr("xlink:href",function(d) { return d.predicate.uri;});
    
    var linkArrowhead = link.filter(function(d) {
        return d.arrow;
    })
        .append("svg:polygon")
        .attr("class", "arrowhead")
        .attr("transform",function(d) {
            angle = Math.atan2(d.y2-d.y1, d.x2-d.x1);
            return "rotate("+angle+", "+d.x2+", "+d.y2+")";
        })
        .attr("points", function(d) {
            //angle = (d.y2-d.y1)/(d.x2-d.x1);
            return [[d.x2,d.y2].join(","),
                    [d.x2-3,d.y2+8].join(","),
                    [d.x2+3,d.y2+8].join(",")].join(" ");
        });

    var preds = vis.selectAll("g.predicate")
        .data(predicates)
        .enter()
        .append("svg:text")
        .call(force.drag)
        .attr("class","link")
        .attr("text-anchor","middle")
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .text(function(d){
            return d.predicate.label;
        })
        .attr("xlink:href",function(d) { return d.predicate.uri;});
    
    var node = vis.selectAll("g.node")
        .data(entities)
        .enter();
    node = node.append("svg:foreignObject")
        .call(force.drag)
        .attr('width',nodeWidth)
        .attr('height','1000');
    
    node.append("xhtml:body").attr('xmlns',"http://www.w3.org/1999/xhtml");
    
    var body = node.selectAll("body");
    var resource = body.append("table")
        .attr("class","resource");
    var titles = resource.append("xhtml:tr")
        .append("xhtml:th")
        .attr("colspan","2")
        .append("xhtml:a")
        .attr("class","title")
        .html(function(d) {
            if (d.label == " ")
                return '<img src="RDFicon.png" width="12" height="12"/>&nbsp;';
            else return d.label; 
        })
        .attr("href",function(d) { return d.uri});
    var types = resource.append("xhtml:tr")
        .append("xhtml:td")
        .attr("colspan","2")
        .attr("class","type")
        .html(function(d) {
            var typeLabels = d.types.map(function(t) {
                return '<a href="'+t.uri+'">'+t.label+'</a>';
            });
            if (typeLabels.length > 0) {
                return "a&nbsp;" + typeLabels.join(", ");
            } else {
                return "";
            }
        })
        .attr("href",function(d) { return d.uri});
    
    var attrs = resource.selectAll("td.attr")
        .data(function(d) {
            var entries = d3.entries(d.attribs);
            //console.log(entries);
            return entries;
        }).enter()
        .append("xhtml:tr");
    //console.log(attrs);
    attrs.append("xhtml:td")
        .attr("class","attrName")
        .text(function(d) {
            //console.log(d.key);
            predicate = getResource(d.key);
            return predicate.label+":";
        });
    attrs.append("xhtml:td")
        .html(function(d) {
            return d.value.map(function(d) {
                if (d.type == "resource") {
                    label = d.label;
                    ext = d.uri.split('.');
                    ext = ext[ext.length-1];
                    //console.log(d);
                    //console.log(ext);
                    if ($.inArray(ext, ['jpg','png','gif',]) != -1) {
                        label = '<img width="100" src="'+d.uri+'" alt="'+label+'"/>'
                    }
                    if (ext == 'ico') {
                        label = '<img src="'+d.uri+'" alt="'+label+'"/>'
                    }
                    if (d.label == " ")
                        label = d.uri;//'<img src="RDFicon.png" width="12" height="12"/>&nbsp;';
                    result = '<a href="'+d.uri+'">'+label+'</a>';
                    //console.log(result);
                    //console.log(result);

                    typeLabels = d.types.map(function(t) {
                        return '<a href="'+t.uri+'">'+t.label+'</a>';
                    });
                    if (typeLabels.length > 0) {
                        result +=  " (a&nbsp;" + typeLabels.join(", ") +")";
                    }

                    return result;
                } else return d;
            }).join(",<br>");
        });
    
    ticks = 0
    force.on("tick", function() {
        ticks += 1
        //console.log(ticks)
        //force.linkDistance(function(d){
        //    console.log(d);
        //    return d.source.width + d.target.width + 50;
        //});
        if (ticks > 300) {
            //console.log("Stopping the sim.");
            force.stop();
            force.charge(0)
                .linkStrength(0)
                .linkDistance(0)
                .gravity(0);
            force.start();
        } else {
            force.stop();
            force.linkDistance(function(d){
                //console.log(d);
                width = d.source.width/2 + d.target.width/2 + 50;
                //console.log(width);
                return width;
            })
            force.start();
        }
      	link.selectAll("line.link")
            .attr("x1", function(d) {
                box = makeCenteredBox(d.source);
                ept = edgePoint(box,
                                [d.source.x,d.source.y],
                                [d.target.x,d.target.y]);
                d.x1 = d.source.x;
                if (ept != null) {
                    d.x1 = ept[0]
                }
                return d.x1; 
            })
            .attr("y1", function(d) {
                box = makeCenteredBox(d.source);
                ept = edgePoint(box,
                                [d.source.x,d.source.y],
                                [d.target.x,d.target.y]);
                d.y1 = d.source.y;
                if (ept != null) {
                    d.y1 = ept[1]
                }
                return d.y1; 
            })
            .attr("x2", function(d) {
                box = makeCenteredBox(d.target);
                ept = edgePoint(box,
                                [d.source.x,d.source.y],
                                [d.target.x,d.target.y]);
                d.x2 = d.target.x;
                if (ept != null) {
                    d.x2 = ept[0]
                }
                return d.x2; 
            })
            .attr("y2", function(d) { 
                box = makeCenteredBox(d.target);
                ept = edgePoint(box,
                                [d.source.x,d.source.y],
                                [d.target.x,d.target.y]);
                d.y2 = d.target.y;
                if (ept != null) {
                    d.y2 = ept[1]
                }
                return d.y2; 
            });

        node.attr("height",function(d) {
            return d.height = this.childNodes[0].childNodes[0].clientHeight+2;
        })
            .attr("width",function(d) {
                return d.width = this.childNodes[0].childNodes[0].clientWidth+2;
            })
            .attr("x", function(d) {
                //d.width = 200;
                d.x = Math.max(d.width/2, Math.min(w-d.width/2, d.x ));
                return d.x - d.width/2;
            })
            .attr("y", function(d) {
                d.y = Math.max(d.height/2, Math.min(h-d.height/2, d.y ));
                //maxHeight = Math.max(maxHeight,d.y+d.height);
                return d.y - d.height/2;
            });

        preds.attr("x", function(d) {
            //d.width = 200;
            d.x = Math.max(10, Math.min(w-10, d.x ));
            return d.x;
        })
            .attr("y", function(d) {
                d.y = Math.max(10, Math.min(h-10, d.y ));
                //maxHeight = Math.max(maxHeight,d.y+d.height);
                return d.y;
            });

        linkArrowhead.attr("points", function(d) {
            return [[d.x2,d.y2].join(","),
                    [d.x2-3,d.y2+8].join(","),
                    [d.x2+3,d.y2+8].join(",")].join(" ");
        })
            .attr("transform",function(d) {
                angle = Math.atan2(d.y2-d.y1, d.x2-d.x1)*180/Math.PI + 90;
                return "rotate("+angle+", "+d.x2+", "+d.y2+")";
            });
        vis.attr("width", w)
            .attr("height", h);

    });
    force.start();
}
}

