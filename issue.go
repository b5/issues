package main

type Issue struct {
	Name       string `json:"name"`
	Description string `json:"description"`
	Completed   bool   `json:"completed"`
	Difficulty  int    `json:"difficulty"`
}
