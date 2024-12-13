前端:
node 版本： v14.21.3
本地启动方式：
npm install 
npm run start


打包方式：
npm install 
npm run build

tar -zcvf dist.tar.gz dist/*


后端：
go 版本
go18.5

go mod tidy
go run commandServer.go


命令说明:
Convert Video Pixel Format
param: 420, 422, 444
ffmpeg -i input.mp4 -pix_fmt yuv${param}p output.mp4

Convert Video Format
param: mp4, avi, mkv, mov, webm
ffmpeg -i input.mp4 -c:a copy output.${param}

Convert video bitrate
param: 500k, 750k, 1000k, 2000k, 3000k
ffmpeg -i input.mp4 -b:v ${param} output.mp4

Convert video frame rate
param: 30, 60, 90
ffmpeg -i input.mp4 -r ${param} output.mp4

Convert video resolution
param: 640x360, 1280x720, 1920x1080, 3840x2160
ffmpeg -i input.mp4 -s ${param} output.mp4

Convert video encoding format
param: libx264, libx265, libvpx-vp9, libaom-av1, libtheora
ffmpeg -i input.mp4 -c:v ${param} output.mp4

Extract Audio
param: wav, mp3, aac, ogg, wma
ffmpeg -i input.mp4 -vn -acodec copy output.${param}



Change image pixel format
param: 420, 422, 444
ffmpeg -i input.jpg -pix_fmt yuv${param}p output.jpg

Convert image format
param: bmp, jpg, png, gif
ffmpeg -i input.jpg output.${param}

Convert image resolution
param: 640x360, 1280x720, 1920x1080
ffmpeg -i input.jpg -s ${param} output.jpg

Merge images into video
param: 3, 5, 10
ffmpeg -loop 1 -i input -c:v libx264 -t ${param} -pix_fmt yuv420p output.mp4
