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
转换视频
ffmpeg -i ./%s/%s -pix_fmt yuv%sp ./%s/output1.%s && touch ./%s/step1.end