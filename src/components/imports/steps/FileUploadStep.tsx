import { File, Upload } from "lucide-react"

interface FileUploadStepProps {
  file: File | null
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function FileUploadStep({ file, onFileChange }: FileUploadStepProps) {
  return (
    <div className="space-y-6 py-6">
      <div 
        className="border-2 border-dashed rounded-md p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <div className="space-y-2">
          <p className="font-medium">点击上传或拖拽文件</p>
          <p className="text-sm text-muted-foreground">
            CSV或JSON文件，最大2MB
          </p>
        </div>
        <input
          id="file-upload"
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={onFileChange}
        />
      </div>
      
      <div className="bg-muted/50 rounded-md p-4 text-sm">
        <h4 className="font-medium mb-2">文件要求：</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>CSV文件应有与订阅字段匹配的标题</li>
          <li>必需字段：name, amount, currency, billingCycle, nextBillingDate, status</li>
          <li>JSON文件应匹配订阅数据结构</li>
        </ul>
      </div>
    </div>
  )
}