package main

type Issue struct {
	Name       string `json:"name"`
	Description string `json:"description"`
	Completed   bool   `json:"completed"`
	Roles []string `json:"roles"`
	Difficulty  int    `json:"difficulty"`
}
