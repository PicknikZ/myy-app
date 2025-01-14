package main

import (
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"

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

func containsFileSubstring(filename string, substring string) bool {
	// 读取文件内容
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		log.Printf("Error reading file: %v", err)
		return false
	}

	// 检查文件内容是否包含子字符串
	return strings.Contains(string(data), substring)
}

func findInputFile(dir string, step int, filename string) (string, error) {
	prefix := ""
	if step == 1 {
		prefix = filename
	} else if step > 1 && step < 8 {
		prefix = fmt.Sprintf("output%d", step-1)
	} else {
		return "", fmt.Errorf("error step: %d", step)
	}

	files, err := os.ReadDir(dir)
	if err != nil {
		fmt.Printf("Error reading directory: %v\n", err)
		return "", err
	}

	for _, file := range files {
		if file.IsDir() {
			continue // 跳过文件夹
		}
		fileName := file.Name()
		if strings.HasPrefix(fileName, prefix) {
			fmt.Println(fileName)
			return fileName, nil
		}
	}
	return findInputFile(dir, step-1, filename)
}

func findOutputFile(dir string, step int, filename string) (string, error) {
	if step == 0 {
		return filename, nil
	}
	prefix := fmt.Sprintf("output%d", step)

	files, err := os.ReadDir(dir)
	if err != nil {
		fmt.Printf("Error reading directory: %v\n", err)
		return "", err
	}

	for _, file := range files {
		if file.IsDir() {
			continue // 跳过文件夹
		}
		fileName := file.Name()
		if strings.HasPrefix(fileName, prefix) {
			fmt.Println(fileName)
			return fileName, nil
		}
	}
	return findOutputFile(dir, step-1, filename)
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

	http.HandleFunc("/uploadImage", uploadImage)

	http.HandleFunc("/changeVideoPixelFormat", changeVideoPixelFormat)
	http.HandleFunc("/convertVideoFormat", convertVideoFormat)

	http.HandleFunc("/transcodeVideoBitrate", transcodeVideoBitrate)
	http.HandleFunc("/convertVideoFrameRate", convertVideoFrameRate)
	http.HandleFunc("/changeVideoResolution", changeVideoResolution)
	http.HandleFunc("/changeVideoCodecFormat", changeVideoCodecFormat)
	http.HandleFunc("/extractAudio", extractAudio)

	http.HandleFunc("/downloadVideo", downloadVideo)

	http.HandleFunc("/getProgress", getProgress)
	http.HandleFunc("/getImageProgress", getImageProgress)

	http.HandleFunc("/changeImagePixelFormat", changeImagePixelFormat)
	http.HandleFunc("/convertImageFormat", convertImageFormat)
	http.HandleFunc("/changeImageResolution", changeImageResolution)
	http.HandleFunc("/mergeImageToVideo", mergeImageToVideo)

	// http.HandleFunc("/changeMultiImagePixelFormat", changeMultiImagePixelFormat)
	// http.HandleFunc("/convertMultiImageFormat", convertMultiImageFormat)
	// http.HandleFunc("/changeMultiImageResolution", changeMultiImageResolution)
	// http.HandleFunc("/mergeMultiImageToVideo", mergeMultiImageToVideo)

	http.HandleFunc("/downloadImage", downloadImage)

	fmt.Println("Server starting on port 8080")
	handler := addCORSMiddleware(http.DefaultServeMux)
	err := http.ListenAndServe(":8080", handler)
	if err != nil {
		fmt.Println("ListenAndServe error: ", err)
	}
}

// *** 图片处理
func uploadImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}
	uid := r.URL.Query().Get("uid")
	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving the file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	fmt.Printf("Uploaded File: %s\n", handler.Filename)
	fmt.Printf("File Size: %d\n", handler.Size)
	fmt.Printf("MIME Header: %v\n", handler.Header)

	// 使用UUID作为文件夹名称
	folderName := uid
	_, err = os.Stat(folderName)
	if err != nil {
		// 创建文件夹
		err = os.Mkdir(folderName, 0755) // 设置适当的权限
		if err != nil {
			fmt.Printf("创建文件夹失败: %s\n", err)
			return
		}
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

func changeImagePixelFormat(w http.ResponseWriter, r *http.Request) {
	cmdStr, output := processImageParam(r, 1)
	runCommand(w, r, cmdStr, output)
}
func convertImageFormat(w http.ResponseWriter, r *http.Request) {
	cmdStr, output := processImageParam(r, 2)
	runCommand(w, r, cmdStr, output)
}
func changeImageResolution(w http.ResponseWriter, r *http.Request) {
	cmdStr, output := processImageParam(r, 3)
	runCommand(w, r, cmdStr, output)
}
func mergeImageToVideo(w http.ResponseWriter, r *http.Request) {
	cmdStr, output := processImageParam(r, 4)
	runCommand(w, r, cmdStr, output)
}
func downloadImage(w http.ResponseWriter, r *http.Request) {
	args := r.URL.Query()
	if uid := args.Get("uid"); uid != "" {
		step := args.Get("step")
		filename := args.Get("filename")
		value := args.Get("value")
		suffix := GetExtension(filename)

		outputFilename := ""
		if step == "2" {
			outputFilename = fmt.Sprintf("output%s-%s.%s", step, value, value)
		} else if step == "4" {
			outputFilename = fmt.Sprintf("output%s-%s.%s", step, value, "mp4")
		} else {
			outputFilename = fmt.Sprintf("output%s-%s.%s", step, value, suffix)
		}
		output := fmt.Sprintf("./%s/%s", uid, outputFilename)
		// 打开文件
		file, err := os.Open(output)
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

// *** 图片处理

func GetExtension(filename string) string {
	lastIndex := strings.LastIndex(filename, ".")
	if lastIndex == -1 {
		return ""
	}
	return filename[lastIndex+1:]
}

// *** 视频处理
func uploadVideo(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

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
		step := args.Get("step")
		filename := args.Get("filename")
		value := args.Get("value")
		suffix := GetExtension(filename)

		outputFilename := ""
		if step == "2" || step == "7" {
			outputFilename = fmt.Sprintf("output%s-%s.%s", step, value, value)
		} else {
			outputFilename = fmt.Sprintf("output%s-%s.%s", step, value, suffix)
		}
		output := fmt.Sprintf("./%s/%s", uid, outputFilename)
		// 打开文件
		file, err := os.Open(output)
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

func extractAudio(w http.ResponseWriter, r *http.Request) {
	cmdStr, output := processVideoParam(r, 7)
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
	step := r.URL.Query().Get("step")
	value := r.URL.Query().Get("value")
	filename := r.URL.Query().Get("filename")
	if value == "" {
		resp := ProgressResponse{Code: 0, Status: "wait"}
		json.NewEncoder(w).Encode(resp)
		return
	}
	suffix := GetExtension(filename)
	outputFilename := ""
	if step == "2" || step == "7" {
		outputFilename = fmt.Sprintf("output%s-%s.%s", step, value, value)
	} else {
		outputFilename = fmt.Sprintf("output%s-%s.%s", step, value, suffix)
	}
	output := fmt.Sprintf("./%s/%s", uid, outputFilename)
	_, err := os.Stat(output)
	if err != nil {
		resp := ProgressResponse{Code: 0, Status: "wait"}
		json.NewEncoder(w).Encode(resp)
		return
	}

	logFile := fmt.Sprintf("./%s/step%s-%s.log", uid, step, value)
	isFailed := containsFileSubstring(logFile, "Conversion failed!") || containsFileSubstring(logFile, "Error")
	if isFailed {
		resp := ProgressResponse{Code: 0, Status: "failed"}
		json.NewEncoder(w).Encode(resp)
		return
	}

	endFile := fmt.Sprintf("./%s/step%s-%s.end", uid, step, value)
	_, err = os.Stat(endFile)
	if err != nil {
		resp := ProgressResponse{Code: 0, Status: "running"}
		json.NewEncoder(w).Encode(resp)
	} else {
		resp := ProgressResponse{Code: 0, Status: "done"}
		json.NewEncoder(w).Encode(resp)
	}
}

// getProgress 根据PID实时获取命令的进度
func getImageProgress(w http.ResponseWriter, r *http.Request) {
	uid := r.URL.Query().Get("uid")
	step := r.URL.Query().Get("step")
	value := r.URL.Query().Get("value")
	filename := r.URL.Query().Get("filename")
	if value == "" {
		resp := ProgressResponse{Code: 0, Status: "wait"}
		json.NewEncoder(w).Encode(resp)
		return
	}
	suffix := GetExtension(filename)
	outputFilename := ""
	if step == "2" {
		outputFilename = fmt.Sprintf("output%s-%s.%s", step, value, value)
	} else if step == "4" {
		outputFilename = fmt.Sprintf("output%s-%s.%s", step, value, "mp4")
	} else {
		outputFilename = fmt.Sprintf("output%s-%s.%s", step, value, suffix)
	}
	output := fmt.Sprintf("./%s/%s", uid, outputFilename)
	_, err := os.Stat(output)
	if err != nil {
		resp := ProgressResponse{Code: 0, Status: "wait"}
		json.NewEncoder(w).Encode(resp)
		return
	}

	logFile := fmt.Sprintf("./%s/step%s-%s.log", uid, step, value)
	isFailed := containsFileSubstring(logFile, "Conversion failed!") || containsFileSubstring(logFile, "Error")
	if isFailed {
		resp := ProgressResponse{Code: 0, Status: "failed"}
		json.NewEncoder(w).Encode(resp)
		return
	}

	endFile := fmt.Sprintf("./%s/step%s-%s.end", uid, step, value)
	_, err = os.Stat(endFile)
	if err != nil {
		resp := ProgressResponse{Code: 0, Status: "running"}
		json.NewEncoder(w).Encode(resp)
	} else {
		resp := ProgressResponse{Code: 0, Status: "done"}
		json.NewEncoder(w).Encode(resp)
	}
}

func processVideoParam(r *http.Request, step int) (cmdStr string, output string) {
	args := r.URL.Query()
	if uid := args.Get("uid"); uid != "" {
		src_file := args.Get("filename")
		filename := src_file
		fmt.Println("filename:", filename)
		suffix := GetExtension(filename)
		if value := args.Get("value"); value != "" {
			switch step {
			case 1:
				return fmt.Sprintf("ffmpeg -i ./%s/%s -pix_fmt yuv%sp ./%s/output1-%s.%s > ./%s/step1-%s.log 2>&1 && touch ./%s/step1-%s.end", uid, filename, value, uid, value, suffix, uid, value, uid, value), fmt.Sprintf("output1-%s.%s", value, suffix)
			case 2:
				filename, _ := findOutputFile(uid, 1, src_file)
				return fmt.Sprintf("ffmpeg -i ./%s/%s -c:a copy ./%s/output2-%s.%s > ./%s/step2-%s.log 2>&1 && touch ./%s/step2-%s.end", uid, filename, uid, value, value, uid, value, uid, value), fmt.Sprintf("output2-%s.%s", value, value)
			case 3:
				filename, _ := findOutputFile(uid, 2, src_file)
				suffix = GetExtension(filename)
				return fmt.Sprintf("ffmpeg -i ./%s/%s -b:v %s ./%s/output3-%s.%s > ./%s/step3-%s.log 2>&1 && touch ./%s/step3-%s.end", uid, filename, value, uid, value, suffix, uid, value, uid, value), fmt.Sprintf("output3-%s.%s", value, suffix)
			case 4:
				filename, _ := findOutputFile(uid, 3, src_file)
				suffix = GetExtension(filename)
				return fmt.Sprintf("ffmpeg -i ./%s/%s -r %s ./%s/output4-%s.%s > ./%s/step4-%s.log 2>&1 && touch ./%s/step4-%s.end", uid, filename, value, uid, value, suffix, uid, value, uid, value), fmt.Sprintf("output4-%s.%s", value, suffix)
			case 5:
				filename, _ := findOutputFile(uid, 4, src_file)
				suffix = GetExtension(filename)
				return fmt.Sprintf("ffmpeg -i ./%s/%s -s %s ./%s/output5-%s.%s > ./%s/step5-%s.log 2>&1 && touch ./%s/step5-%s.end", uid, filename, value, uid, value, suffix, uid, value, uid, value), fmt.Sprintf("output5-%s.%s", value, suffix)
			case 6:
				filename, _ := findOutputFile(uid, 5, src_file)
				suffix = GetExtension(filename)
				return fmt.Sprintf("ffmpeg -i ./%s/%s -c:v %s ./%s/output6-%s.%s > ./%s/step6-%s.log 2>&1 && touch ./%s/step6-%s.end", uid, filename, value, uid, value, suffix, uid, value, uid, value), fmt.Sprintf("output6-%s.%s", value, suffix)
			case 7:
				filename, _ := findOutputFile(uid, 6, src_file)
				return fmt.Sprintf("ffmpeg -i ./%s/%s -vn -acodec copy ./%s/output7-%s.%s > ./%s/step7-%s.log 2>&1 && touch ./%s/step7-%s.end", uid, filename, uid, value, value, uid, value, uid, value), fmt.Sprintf("output7-%s.%s", value, value)
			}
		}
	}
	return "", ""
}

func processImageParam(r *http.Request, step int) (cmdStr string, output string) {
	args := r.URL.Query()
	if uid := args.Get("uid"); uid != "" {
		src_file := args.Get("filename")
		filename := src_file
		fmt.Println("filename:", filename)
		suffix := GetExtension(filename)
		if value := args.Get("value"); value != "" {
			switch step {
			case 1:
				return fmt.Sprintf("ffmpeg -i ./%s/%s -pix_fmt yuv%sp ./%s/output1-%s.%s > ./%s/step1-%s.log 2>&1 && touch ./%s/step1-%s.end", uid, filename, value, uid, value, suffix, uid, value, uid, value), fmt.Sprintf("output1-%s.%s", value, suffix)
			case 2:
				filename, _ := findOutputFile(uid, 1, src_file)
				return fmt.Sprintf("ffmpeg -i ./%s/%s ./%s/output2-%s.%s > ./%s/step2-%s.log 2>&1 && touch ./%s/step2-%s.end", uid, filename, uid, value, value, uid, value, uid, value), fmt.Sprintf("output2-%s.%s", value, value)
			case 3:
				filename, _ := findOutputFile(uid, 2, src_file)
				suffix = GetExtension(filename)
				return fmt.Sprintf("ffmpeg -i ./%s/%s -s %s ./%s/output3-%s.%s > ./%s/step3-%s.log 2>&1 && touch ./%s/step3-%s.end", uid, filename, value, uid, value, suffix, uid, value, uid, value), fmt.Sprintf("output3-%s.%s", value, suffix)
			case 4:
				filename, _ := findOutputFile(uid, 3, src_file)
				suffix = GetExtension(filename)
				return fmt.Sprintf("ffmpeg -loop 1 -i ./%s/%s -c:v libx264 -t %s -pix_fmt yuv420p ./%s/output4-%s.mp4 > ./%s/step4-%s.log 2>&1 && touch ./%s/step4-%s.end", uid, filename, value, uid, value, uid, value, uid, value), fmt.Sprintf("output4-%s.%s", value, suffix)
			}
		}
	}
	return "", ""
}
