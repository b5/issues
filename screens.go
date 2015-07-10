package main

import (
	"encoding/json"
	"io/ioutil"
)

var screens []*Screen

func init() {
	data, err := ioutil.ReadFile("screens.json")
	if err != nil {
		panic(err.Error())
	}

	if err := json.Unmarshal(data, &screens); err != nil {
		panic(err.Error())
	}
}

func WriteFile() {
	data, err := json.MarshalIndent(screens, "", "\t")
	if err != nil {
		panic(err.Error())
	}
	if err := ioutil.WriteFile("screens.json", data, 0); err != nil {
		panic(err.Error())
	}
}