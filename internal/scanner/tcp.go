package scanner

import (
	"context"
	"net"
	"time"
)

// tcpPorts — порты, по которым проверяем живость хоста.
var tcpPorts = []int{135, 445, 3389, 22, 80, 9100}

// checkTCP — true, если удалось подключиться хотя бы на один порт.
func checkTCP(ctx context.Context, ip string, timeout time.Duration) bool {
	for _, p := range tcpPorts {
		select {
		case <-ctx.Done():
			return false
		default:
		}
		addr := net.JoinHostPort(ip, itoa(p))
		conn, err := net.DialTimeout("tcp", addr, timeout)
		if err == nil {
			_ = conn.Close()
			return true
		}
	}
	return false
}

func itoa(n int) string {
	// небольшой локальный itoa, чтобы не тянуть strconv в горячий цикл ради 6 значений
	if n == 0 {
		return "0"
	}
	var buf [6]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}