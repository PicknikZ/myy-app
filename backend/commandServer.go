package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"

	"encoding/json"

	"github.com/google/uuid"
)

// CommandInfo 存储命令的信息
type CommandInfo struct {
	Pid     int    `json:"pid"`
	Command string `json:"command"`
	Output  string `json:"output"`
}

// 定义响应结构体
type ResponseData struct {
	Code string `json:"code"`
	Msg  string `json:"msg"`
	UID  string `json:"uid"`
}

// 定义响应结构体
type ProgressResponse struct {
	Code   int    `json:"code"`
	Status string `json:"status"`
}

var commands = make(map[int]*exec.Cmd)
var mu sync.Mutex

func getSingleFilePath(dirName string) (string, error) {
	// 获取当前路径
	currentPath, err := os.Getwd()
	if err != nil {
		return "", err
	}

	// 构建目标目录的完整路径
	targetDir := filepath.Join(currentPath, dirName)

	// 检查目录是否存在
	if _, err := os.Stat(targetDir); os.IsNotExist(err) {
		return "", fmt.Errorf("directory does not exist: %s", targetDir)
	}

	// 读取目录内容
	entries, err := os.ReadDir(targetDir)
	if err != nil {
		return "", err
	}

	// 检查目录下是否只有一个文件
	var filePath string
	fileCount := 0
	for _, entry := range entries {
		if !entry.IsDir() {
			filePath = filepath.Join(targetDir, entry.Name())
			fileCount++
			if fileCount > 1 {
				return "", fmt.Errorf("more than one file in the directory: %s", targetDir)
			}
		}
	}

	// 检查是否没有文件
	if fileCount == 0 {
		return "", fmt.Errorf("no files found in the directory: %s", targetDir)
	}

	return filePath, nil
}

func addCORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 设置CORS头
		w.Header().Set("Access-Control-Allow-Origin", "http://127.0.0.1:3000") // 允许特定的源访问
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Requested-With") // 添加X-Requested-With
		w.Header().Set("Access-Control-Allow-Credentials", "true")                                                                                     // 允许凭证

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	http.HandleFunc("/uploadVideo", uploadVideo)

	http.HandleFunc("/changeVideoPixelFormat", changeVideoPixelFormat)
	http.HandleFunc("/convertVideoFormat", convertVideoFormat)

	http.HandleFunc("/transcodeVideoBitrate", transcodeVideoBitrate)
	http.HandleFunc("/convertVideoFrameRate", convertVideoFrameRate)
	http.HandleFunc("/changeVideoResolution", changeVideoResolution)
	http.HandleFunc("/changeVideoCodecFormat", changeVideoCodecFormat)

	http.HandleFunc("/downloadVideo", downloadVideo)

	http.HandleFunc("/getProgress", getProgress)
	http.HandleFunc("/uploadImage", uploadImage)

	fmt.Println("Server starting on port 8080")
	handler := addCORSMiddleware(http.DefaultServeMux)
	err := http.ListenAndServe(":8080", handler)
	if err != nil {
		fmt.Println("ListenAndServe error: ", err)
	}
}

func uploadVideo(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	r.ParseMultipartForm(32 << 20) // 限制为32MB
	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving the file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	fmt.Printf("Uploaded File: %s\n", handler.Filename)
	fmt.Printf("File Size: %d\n", handler.Size)
	fmt.Printf("MIME Header: %v\n", handler.Header)

	u, err := uuid.NewRandom()
	if err != nil {
		fmt.Printf("生成UUID失败: %s\n", err)
		return
	}

	// 使用UUID作为文件夹名称
	folderName := u.String()

	// 创建文件夹
	err = os.Mkdir(folderName, 0755) // 设置适当的权限
	if err != nil {
		fmt.Printf("创建文件夹失败: %s\n", err)
		return
	}

	fmt.Printf("文件夹 '%s' 创建成功\n", folderName)

	// 创建文件准备保存上传的视频文件
	dst, err := os.Create("./" + folderName + "/" + handler.Filename)
	if err != nil {
		http.Error(w, "Unable to create destination file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	// 将文件内容复制到目标文件
	_, err = io.Copy(dst, file)
	if err != nil {
		http.Error(w, "Unable to save the file", http.StatusInternalServerError)
		return
	}

	// 构建响应数据
	response := ResponseData{
		Code: "0",
		Msg:  "upload success",
		UID:  folderName,
	}

	// 设置响应头为JSON类型
	w.Header().Set("Content-Type", "application/json")

	// 将响应数据编码为JSON并写入响应体
	json.NewEncoder(w).Encode(response)
}

func downloadVideo(w http.ResponseWriter, r *http.Request) {

	args := r.URL.Query()
	if uid := args.Get("uid"); uid != "" {
		filepath, err := getSingleFilePath(uid)
		if err != nil {
			fmt.Println("Err", err)
			return
		}
		// 打开文件
		file, err := os.Open(filepath)
		if err != nil {
			http.Error(w, "File not found.", http.StatusNotFound)
			return
		}
		defer file.Close()

		// 获取文件信息
		fileInfo, err := file.Stat()
		if err != nil {
			http.Error(w, "Error getting file info.", http.StatusInternalServerError)
			return
		}

		// 设置响应头
		w.Header().Set("Content-Type", "video/x-msvideo") // 或者根据文件类型设置正确的MIME类型
		w.Header().Set("Content-Disposition", "attachment; filename="+fileInfo.Name())
		w.Header().Set("Content-Length", strconv.FormatInt(fileInfo.Size(), 10))

		// 将文件内容复制到响应体
		_, err = io.Copy(w, file)
		if err != nil {
			http.Error(w, "Error sending file.", http.StatusInternalServerError)
			return
		}
	}
}

func uploadImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	r.ParseMultipartForm(32 << 20) // 限制为32MB
	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving the file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	fmt.Printf("Uploaded File: %s\n", handler.Filename)
	fmt.Printf("File Size: %d\n", handler.Size)
	fmt.Printf("MIME Header: %v\n", handler.Header)

	// 创建文件准备保存上传的视频文件
	dst, err := os.Create("./image/" + handler.Filename)
	if err != nil {
		http.Error(w, "Unable to create destination file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	// 将文件内容复制到目标文件
	_, err = io.Copy(dst, file)
	if err != nil {
		http.Error(w, "Unable to save the file", http.StatusInternalServerError)
		return
	}

	// 响应客户端
	fmt.Fprintln(w, "File uploaded successfully")
}

func GetExtension(filename string) string {
	lastIndex := strings.LastIndex(filename, ".")
	if lastIndex == -1 {
		return ""
	}
	return filename[lastIndex+1:]
}

func changeVideoPixelFormat(w http.ResponseWriter, r *http.Request) {
	cmdStr, output := processVideoParam(r, 1)
	runCommand(w, r, cmdStr, output)
}

func convertVideoFormat(w http.ResponseWriter, r *http.Request) {
	cmdStr, output := processVideoParam(r, 2)
	runCommand(w, r, cmdStr, output)
}

func transcodeVideoBitrate(w http.ResponseWriter, r *http.Request) {
	cmdStr, output := processVideoParam(r, 3)
	runCommand(w, r, cmdStr, output)
}

func convertVideoFrameRate(w http.ResponseWriter, r *http.Request) {
	cmdStr, output := processVideoParam(r, 4)
	runCommand(w, r, cmdStr, output)
}

func changeVideoResolution(w http.ResponseWriter, r *http.Request) {
	cmdStr, output := processVideoParam(r, 5)
	runCommand(w, r, cmdStr, output)
}

func changeVideoCodecFormat(w http.ResponseWriter, r *http.Request) {
	cmdStr, output := processVideoParam(r, 6)
	runCommand(w, r, cmdStr, output)
}

func runCommand(w http.ResponseWriter, r *http.Request, cmdStr string, output string) {
	cmd := exec.Command("sh", "-c", cmdStr)
	fmt.Println("cmdStr: " + cmdStr)

	if err := cmd.Start(); err != nil {
		fmt.Println("Error:", err)
		http.Error(w, "Failed to start command", http.StatusInternalServerError)
		return
	}

	pid := cmd.Process.Pid

	// 创建响应结构体
	response := CommandInfo{
		Pid:     pid,
		Command: cmdStr,
		Output:  output,
	}

	// 设置响应头为JSON类型
	w.Header().Set("Content-Type", "application/json")

	// 将响应数据编码为JSON并写入响应体
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response to JSON", http.StatusInternalServerError)
	}
}

// getProgress 根据PID实时获取命令的进度
func getProgress(w http.ResponseWriter, r *http.Request) {
	uid := r.URL.Query().Get("uid")
	output := r.URL.Query().Get("output")

	filename := fmt.Sprintf("./%s/%s", uid, output)
	_, err := os.Stat(filename)
	if err != nil {
		resp := ProgressResponse{Code: 0, Status: "wait"}
		json.NewEncoder(w).Encode(resp)
		return
	}

	pidStr := r.URL.Query().Get("pid")
	fmt.Println("pidStr", pidStr)
	pid, err := strconv.Atoi(pidStr)
	if err != nil {
		http.Error(w, "Invalid PID", http.StatusBadRequest)
		return
	}
	// 检查进程是否存在
	process, err := os.FindProcess(pid)
	if err != nil {
		// 如果进程不存在，返回{"data": 0, "status": "done"}
		resp := ProgressResponse{Code: 0, Status: "done"}
		json.NewEncoder(w).Encode(resp)
		return
	}
	defer process.Release()

	// 检查进程是否仍在运行
	if err := process.Signal(syscall.Signal(0)); err != nil {
		// 进程不存在或已结束，返回{"data": 0, "status": "done"}
		resp := ProgressResponse{Code: 0, Status: "done"}
		json.NewEncoder(w).Encode(resp)
	} else {
		// 进程仍在运行，返回{"data": 0, "status": "running"}
		resp := ProgressResponse{Code: 0, Status: "running"}
		json.NewEncoder(w).Encode(resp)
	}
}

func processVideoParam(r *http.Request, step int) (cmdStr string, output string) {
	args := r.URL.Query()
	if uid := args.Get("uid"); uid != "" {
		filepath, err := getSingleFilePath(uid)
		fmt.Println("filepath:", filepath)
		if err != nil {
			fmt.Println("Error:", err)
			return "", ""
		}
		suffix := GetExtension(filepath)
		if value := args.Get("value"); value != "" {
			switch step {
			case 1:
				return fmt.Sprintf("/usr/local/bin/ffmpeg -i %s -pix_fmt yuv%sp output1.%s > cmd1.log", filepath, value, suffix), fmt.Sprintf("output2.%s", suffix)
				//return fmt.Sprintf("echo 123 %s %s %s", filepath, value, suffix)
			case 2:
				return fmt.Sprintf("ffmpeg -i %s -c:a copy output2.%s > cmd2.log", filepath, value), fmt.Sprintf("output2.%s", value)
			case 3:
				return fmt.Sprintf("ffmpeg -i %s -b:v %s output3.%s > cmd3.log", filepath, value, suffix), fmt.Sprintf("output2.%s", suffix)
			case 4:
				return fmt.Sprintf("ffmpeg -i %s -r %s output4.%s > cmd4.log", filepath, value, suffix), fmt.Sprintf("output2.%s", suffix)
			case 5:
				return fmt.Sprintf("ffmpeg -i %s -s %s output5.%s > cmd5.log", filepath, value, suffix), fmt.Sprintf("output2.%s", suffix)
			case 6:
				return fmt.Sprintf("ffmpeg -i %s -c:v %s output6.%s > cmd6.log", filepath, value, suffix), fmt.Sprintf("output2.%s", suffix)
			}
		}
	}
	return "", ""
}
