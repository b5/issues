package main

import (
	"time"
	"code.google.com/p/go-uuid/uuid"
)

type Screen struct {
	Id          string   `json:"id"`
	Created     int64    `json:"created"`
	Updated     int64    `json:"updated"`
	Name        string   `json:"name"`
	Roles       []string `json:"roles"`
	Description string   `json:"description"`
	Issues      []*Issue `json:"issues"`
}

func NewScreen(id string) *Screen {
	return &Screen{
		Id : id,
	}
}

func (sc *Screen) Read() error {
	for _, s := range screens {
		if s.Id == sc.Id {
			*sc = *s
		}
	}
	return nil
}

func (sc *Screen) Save() error {
	sc.Updated = time.Now().Unix()

	if sc.Id == "" {
		sc.Id = uuid.New()
		sc.Created = sc.Updated
		screens = append([]*Screen{sc}, screens...)
	} else {
		for i, s := range screens {
			if s.Id == sc.Id {
				screens[i] = sc
				break
			}
		}
	}
	
	WriteFile()

	return nil
}

func (sc *Screen) Delete() error {
	for i, s := range screens {
		if s.Id == sc.Id {
			screens = append(screens[:i],screens[i+1:]...)
			break
		}
	}

	WriteFile()
	
	return nil
}
