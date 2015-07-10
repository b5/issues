package main

import (
	"log"
	"flag"
	"github.com/codegangsta/negroni"
	"github.com/julienschmidt/httprouter"
	"html/template"
	"net/http"
)

var AppTemplate = template.Must(template.ParseFiles("templates/app.html"))

func main() {
	// Get Port
	port := flag.String("p", "5000", "Port to bind to")
	flag.Parse()

	r := httprouter.New()

	r.GET("/", AppHandler)
	r.GET("/screens", AppHandler)
	r.GET("/screens/:id", AppHandler)
	r.GET("/screens/:id/:issue", AppHandler)

	r.GET("/api/screens", ScreensHandler)
	r.POST("/api/screens", SaveScreenHandler)
	r.GET("/api/screens/:id", ScreenHandler)
	r.PUT("/api/screens/:id", SaveScreenHandler)
	r.DELETE("/api/screens/:id", DeleteScreenHandler)

	// serve static directories
	r.ServeFiles("/js/*filepath", http.Dir("public/js"))
	r.ServeFiles("/css/*filepath", http.Dir("public/css"))
	r.ServeFiles("/fonts/*filepath", http.Dir("public/fonts"))
	r.ServeFiles("/svg/*filepath", http.Dir("public/svg"))
	r.ServeFiles("/img/*filepath", http.Dir("public/img"))

	n := negroni.New(negroni.NewLogger())
	n.UseHandler(r)
	n.Run(":" + *port)
}

func AppHandler(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	if err := AppTemplate.Execute(w, map[string]interface{}{
		"data" : map[string]interface{}{
			"screens" : screens,
		},
	}); err != nil {
		log.Println(err.Error())
	}
}
