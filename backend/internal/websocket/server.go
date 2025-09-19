package websocket

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	socketio "github.com/googollee/go-socket.io"
	"github.com/googollee/go-socket.io/engineio"
	"github.com/googollee/go-socket.io/engineio/transport"
	"github.com/googollee/go-socket.io/engineio/transport/polling"
	"github.com/googollee/go-socket.io/engineio/transport/websocket"
)

type Server struct {
	socketServer *socketio.Server
}

func NewServer() *Server {
	// Allow cross-origin for development
	server := socketio.NewServer(&engineio.Options{
		Transports: []transport.Transport{
			&polling.Transport{
				CheckOrigin: allowOriginFunc,
			},
			&websocket.Transport{
				CheckOrigin: allowOriginFunc,
			},
		},
	})

	return &Server{
		socketServer: server,
	}
}

func allowOriginFunc(r *http.Request) bool {
	// Allow all origins for development - in production, restrict this
	return true
}

func (s *Server) SetupHandlers() {
	s.socketServer.OnConnect("/", func(c socketio.Conn) error {
		log.Printf("Socket client connected: %s", c.ID())
		c.SetContext("")
		return nil
	})

	s.socketServer.OnEvent("/", "auth", func(c socketio.Conn, token string) {
		log.Printf("Client %s attempting authentication", c.ID())

		if token == "" {
			log.Printf("Client %s authentication failed: no token provided", c.ID())
			c.Emit("auth_error", "No authentication token provided")
			return
		}

		tokenPreview := token
		if len(token) > 20 {
			tokenPreview = token[:20] + "..."
		}
		log.Printf("Client %s authenticated with token: %s", c.ID(), tokenPreview)

		// Store token as userID context (in production, extract actual userID from JWT)
		userID := "user_" + c.ID() // Temporary - should be actual user ID from JWT
		c.SetContext(userID)

		// Join user-specific room for targeted updates
		c.Join("user_" + userID)
		c.Emit("auth_success", "Authentication successful")

		log.Printf("Client %s authenticated as user: %s", c.ID(), userID)
	})

	s.socketServer.OnEvent("/", "join_processing_queue", func(c socketio.Conn, data interface{}) {
		log.Printf("Client %s joined processing queue updates", c.ID())
		c.Join("processing_queue")
		c.Emit("joined_processing_queue", "Subscribed to processing queue updates")
	})

	s.socketServer.OnDisconnect("/", func(c socketio.Conn, reason string) {
		log.Printf("Socket client disconnected: %s, reason: %s", c.ID(), reason)
	})

	s.socketServer.OnError("/", func(c socketio.Conn, err error) {
		log.Printf("Socket error for client %s: %v", c.ID(), err)
	})
}

// BroadcastProcessingUpdate sends processing task updates to subscribed clients
func (s *Server) BroadcastProcessingUpdate(update map[string]interface{}) {
	log.Printf("Broadcasting processing update: %+v", update)
	s.socketServer.BroadcastToRoom("/", "processing_queue", "processing_update", update)
}

// BroadcastToUser sends updates to a specific user
func (s *Server) BroadcastToUser(userID string, event string, data interface{}) {
	log.Printf("Broadcasting to user %s: %s", userID, event)
	s.socketServer.BroadcastToRoom("/", "user_"+userID, event, data)
}

func (s *Server) GinHandler() gin.HandlerFunc {
	return gin.WrapH(s.socketServer)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.socketServer.ServeHTTP(w, r)
}

// GetServer returns the underlying socket.io server instance
func (s *Server) GetServer() *socketio.Server {
	return s.socketServer
}
