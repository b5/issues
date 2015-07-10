package main

import (
	"log"
	"encoding/json"
	"github.com/julienschmidt/httprouter"
	"net/http"
)

func writeJsonEnvelope(w http.ResponseWriter, data interface{}) {
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"data" : data,
		"meta" : map[string]interface{}{
			"code" : 200,
		},
	}); err != nil {
		log.Println(err.Error())
	}
}

func ScreensHandler(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	writeJsonEnvelope(w, screens)
}
func SaveScreenHandler(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	screen := NewScreen(p.ByName("id"))
	if err := json.NewDecoder(r.Body).Decode(&screen); err == nil {
		screen.Save()
	} else {
		log.Println(err.Error())
	}
	writeJsonEnvelope(w, screen)
}
func ScreenHandler(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	screen := NewScreen(p.ByName("id"))
	screen.Read()
	writeJsonEnvelope(w, screen)
}
func DeleteScreenHandler(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	screen := NewScreen(p.ByName("id"))
	screen.Delete()
	writeJsonEnvelope(w, screen)
}