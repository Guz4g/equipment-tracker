package scanner

import (
	"context"
	"net"
	"time"

	"golang.org/x/net/icmp"
	"golang.org/x/net/ipv4"
)

// checkICMP — пингует хост. Требует прав администратора на Windows.
func checkICMP(ctx context.Context, ip string, timeout time.Duration) (bool, error) {
	conn, err := icmp.ListenPacket("ip4:icmp", "0.0.0.0")
	if err != nil {
		return false, err
	}
	defer conn.Close()

	dst, err := net.ResolveIPAddr("ip4", ip)
	if err != nil {
		return false, nil
	}
	msg := icmp.Message{
		Type: ipv4.ICMPTypeEcho,
		Code: 0,
		Body: &icmp.Echo{
			ID:   1,
			Seq:  1,
			Data: []byte("ping"),
		},
	}
	b, err := msg.Marshal(nil)
	if err != nil {
		return false, nil
	}
	if _, err := conn.WriteTo(b, dst); err != nil {
		return false, nil
	}
	_ = conn.SetReadDeadline(time.Now().Add(timeout))
	buf := make([]byte, 1500)
	for {
		select {
		case <-ctx.Done():
			return false, nil
		default:
		}
		n, _, err := conn.ReadFrom(buf)
		if err != nil {
			return false, nil
		}
		rm, err := icmp.ParseMessage(1, buf[:n])
		if err != nil {
			continue
		}
		if rm.Type == ipv4.ICMPTypeEchoReply {
			return true, nil
		}
	}
}