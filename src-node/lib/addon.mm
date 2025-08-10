#include <napi.h>
#include <CoreFoundation/CoreFoundation.h>
#include <AppKit/AppKit.h>
#include <QuickLook/QuickLook.h>
#include <CoreServices/CoreServices.h>
#include "getIconForFile.h"

class MacAddon : public Napi::Addon<MacAddon> {
public:
  MacAddon(Napi::Env env, Napi::Object exports) {
    DefineAddon(exports, {
      InstanceMethod("getFrontmostAppInfo", &MacAddon::GetFrontmostAppInfo),
      InstanceMethod("getIconForFile", &MacAddon::InnerGetIconForFile),
      InstanceMethod("hanziToPinyin", &MacAddon::HanziToPinyin),
    });
  }

private:
  // 1. 获取前台应用信息
  Napi::Value GetFrontmostAppInfo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Object result = Napi::Object::New(env);
    
    @autoreleasepool {
      NSWorkspace *workspace = [NSWorkspace sharedWorkspace];
      NSRunningApplication *frontApp = [workspace frontmostApplication];
      
      if (frontApp) {
        NSString *appName = [frontApp localizedName] ?: @"Unknown";
        NSString *bundleIdentifier = [frontApp bundleIdentifier] ?: @"Unknown";
        
        result.Set("name", 
                  Napi::String::New(env, [appName UTF8String]));
                  
        result.Set("bundleIdentifier", 
                  Napi::String::New(env, [bundleIdentifier UTF8String]));
      } else {
        result.Set("name", 
                  Napi::String::New(env, "No frontmost application found"));
        result.Set("bundleIdentifier", 
                  Napi::String::New(env, "Unknown"));
      }
    }
    
    return result; // 确保所有分支都返回了值
  }

  // 2. 获取文件图标 (异步)
  Napi::Value InnerGetIconForFile(const Napi::CallbackInfo& info) {
    return GetIconForFile(info);
  }

  // 3. 汉字转拼音 (同步)
  Napi::Value HanziToPinyin(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // 参数验证
    if (info.Length() < 1 || !info[0].IsString()) {
      Napi::TypeError::New(env, "需要参数: string").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    // 获取输入字符串
    std::string input = info[0].As<Napi::String>().Utf8Value();
    
    // 执行转换（在自动释放池中）
    __block Napi::Value result = env.Null();
    @autoreleasepool {
      result = ConvertHanziToPinyin(env, input);
    }
    
    return result;
  }
  
  // 核心转换逻辑
  Napi::Value ConvertHanziToPinyin(Napi::Env env, const std::string& input) {
    // 创建 CFString
    CFStringRef cfString = CFStringCreateWithBytes(
      kCFAllocatorDefault, 
      reinterpret_cast<const UInt8*>(input.c_str()), 
      input.length(), 
      kCFStringEncodingUTF8, 
      false
    );
    
    if (!cfString) {
      Napi::Error::New(env, "创建 CFString 失败").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    // 创建可变字符串
    CFMutableStringRef mutableString = CFStringCreateMutableCopy(NULL, 0, cfString);
    CFRelease(cfString);
    
    if (!mutableString) {
      Napi::Error::New(env, "创建可变字符串失败").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    // 转换为拼音（带音调）
    if (!CFStringTransform(mutableString, NULL, kCFStringTransformMandarinLatin, false)) {
      CFRelease(mutableString);
      Napi::Error::New(env, "汉字转拼音失败").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    // 去除音调符号
    if (!CFStringTransform(mutableString, NULL, kCFStringTransformStripDiacritics, false)) {
      CFRelease(mutableString);
      Napi::Error::New(env, "去除音调失败").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    // 准备缓冲区
    CFIndex length = CFStringGetLength(mutableString);
    CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
    char* buffer = new char[maxSize];
    
    // 转换为 C 字符串
    if (!CFStringGetCString(mutableString, buffer, maxSize, kCFStringEncodingUTF8)) {
      delete[] buffer;
      CFRelease(mutableString);
      Napi::Error::New(env, "字符串转换失败").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    // 创建 JavaScript 字符串
    Napi::Value jsResult = Napi::String::New(env, buffer);
    
    // 清理
    delete[] buffer;
    CFRelease(mutableString);
    
    return jsResult;
  }
};

// 模块注册
NODE_API_ADDON(MacAddon)