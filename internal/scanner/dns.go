package scanner

import (
	"context"
	"net"
	"strings"
	"time"
)

// lookupName — reverse DNS с таймаутом. Пустая строка при ошибке/отсутствии PTR.
func lookupName(ctx context.Context, ip string, timeout time.Duration) string {
	type res struct{ name string }
	ch := make(chan res, 1)
	go func() {
		names, err := net.LookupAddr(ip)
		if err != nil || len(names) == 0 {
			ch <- res{""}
			return
		}
		ch <- res{strings.TrimSuffix(names[0], ".")}
	}()
	select {
	case <-ctx.Done():
		return ""
	case r := <-ch:
		return r.name
	case <-time.After(timeout):
		return ""
	}
}