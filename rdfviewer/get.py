#!/usr/bin/env python

import sadi
from rdflib import *
from surf import *

import re

import rdflib
from urllib2 import *
import urllib
from urlparse import urljoin, urldefrag

extensions = {
    "owl":"application/rdf+xml",
    "rdf":"application/rdf+xml",
    "ttl":"text/turtle",
    "n3":"text/n3",
    "ntp":"text/plain",
    "html":"text/html"
}

acceptHeader = ', '.join([
    "application/rdf+xml",
    "text/turtle",
    "text/n3"
])

def absolutize(uri, base):
    if uri.startswith('#') or len(uri) == 0:
        return URIRef(base + uri)
    elif uri.startswith('/'):
        return '/'.join(base.split('/')[:3])+uri
    elif ':' not in uri:
        return URIRef(base+'/'+uri)
    else:
        return uri

# The Service itself
class Get(sadi.Service):

    # Service metadata.
    label = "Retrive a URL and return the resulting RDF graph."
    serviceDescriptionText = 'This service retrieves data from a URL and attempts to parse the data into RDF and returns the RDF graph in the requested format. It assumes that all URIs referenced in the input document are accessible as Linked Data, and can be parsed as RDF.'
    comment = serviceDescriptionText
    serviceNameText = "Get a URL"
    name = "get"

    def getOrganization(self):
        result = self.Organization("http://tw.rpi.edu")
        result.mygrid_authoritative = True
        result.protegedc_creator = 'mccusker@gmail.com'
        result.save()
        return result

    def getInputClass(self):
        return ns.OWL["Thing"]

    def getOutputClass(self):
        return ns.OWL["Thing"]

    def parse(self,graph, content,contentType, base):
        g = Graph()
        self.deserialize(g, content, contentType)
        print g.serialize(format='turtle')
        for stmt in g:
            g.remove(stmt)
            o=stmt[2]
            if type(stmt[2]) == URIRef:
                o = URIRef(absolutize(stmt[2],base))
            g.add((URIRef(absolutize(stmt[0],base)),
                    URIRef(absolutize(stmt[1],base)),
                    o))
        c = g.serialize(format='xml')
        graph.parse(StringIO(c), format='xml')
        
    def process(self, input, output):
        store = output.session.default_store
        headers = {'Accept':acceptHeader}
        request = Request(str(output.subject), None, headers)
        cnxn = urlopen(request)
        content = cnxn.read()
        #print content
        contentType = cnxn.headers['Content-Type']
        print contentType
        try:
            self.parse(store.reader.graph,content,contentType,cnxn.url)
        except:
            fe = urllib.splitquery(cnxn.url)[0].split('.')[-1]
            self.parse(store.reader.graph,content,extensions[fe],cnxn.url)

resource = Get()

# Set up the service to listen on port 9090
if __name__ == "__main__":
    sadi.publishTwistedService(resource, port=9090)

