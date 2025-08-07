#include <napi.h>
#include "DictionaryKit/TTTDictionary.h"

/**
 #   extern CFArrayRef DCSCopyRecordsForSearchString (DCSDictionaryRef, CFStringRef, unsigned long long, long long)
 #       unsigned long long method
 #           0   = exact match
 #           1   = forward match (prefix match)
 #           2   = partial query match (matching (leading) part of query; including ignoring diacritics, four tones in Chinese, etc)
 #           >=3 = ? (exact match?)
 #
 #       long long max_record_count
 */

extern CFArrayRef DCSCopyRecordsForSearchString(DCSDictionaryRef, CFStringRef, unsigned long long, long long);
extern CFArrayRef DCSCopyAvailableDictionaries(void);
extern CFDataRef DCSRecordCopyData(DCSDictionaryRef record);
extern CFArrayRef DCSGetActiveDictionaries(void);
extern DCSDictionaryRef DCSGetDefaultDictionary(void);

// 4. 查询单词定义 (同步)
Napi::Value LookupWord(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  // 参数验证
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "需要参数: string").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  // 获取输入单词
  std::string word = info[0].As<Napi::String>().Utf8Value();
  
  // 在自动释放池中执行查询
  __block Napi::Value result = env.Null();
  @autoreleasepool {
    // 转换为 CFString
    CFStringRef cfWord = CFStringCreateWithCString(
      kCFAllocatorDefault,
      word.c_str(),
      kCFStringEncodingUTF8
    );
    
    if (!cfWord) {
      Napi::Error::New(env, "创建 CFString 失败").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    // 查询单词定义
    CFRange range = DCSGetTermRangeInString(NULL, cfWord, 0);
    
    CFStringRef definition = DCSCopyTextDefinition(
      NULL,
      cfWord,
      range
    );
    
    if (definition) {
      // 转换定义为 C 字符串
      const char* cDefinition = CFStringGetCStringPtr(definition, kCFStringEncodingUTF8);
      if (cDefinition) {
        result = Napi::String::New(env, cDefinition);
      } else {
        // 如果直接获取失败，使用缓冲区
        CFIndex length = CFStringGetLength(definition);
        CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
        char* buffer = new char[maxSize];
        
        if (CFStringGetCString(definition, buffer, maxSize, kCFStringEncodingUTF8)) {
          result = Napi::String::New(env, buffer);
        }
        
        delete[] buffer;
      }
      
      CFRelease(definition);
    } else {
      result = Napi::String::New(env, "未找到定义");
    }
    
    CFRelease(cfWord);
  }
  
  return result;
}

// 4. 查询单词定义HTML (同步)
Napi::Value LookupWordHTML(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  // 参数验证
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "需要参数: string").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  // 获取输入单词
  std::string word = info[0].As<Napi::String>().Utf8Value();

  // 在自动释放池中执行查询
  Napi::Array result = Napi::Array::New(env);

  @autoreleasepool {
    // 转换为 NSString
    NSString *nsWord = [NSString stringWithUTF8String:word.c_str()];
    NSArray<TTTDictionary *> *dictionaries = [TTTDictionary activeDictionaries];

    for (TTTDictionary *dictionary in dictionaries) {
      Napi::Object jsResult = Napi::Object::New(env);
      jsResult.Set("dictionary", Napi::String::New(env, [dictionary.name UTF8String]));
      jsResult.Set("isUserDictionary", dictionary.isUserDictionary);
      Napi::Array entries = Napi::Array::New(env);
      for (TTTDictionaryEntry *entry in [dictionary entriesForSearchTerm:nsWord]) {
        Napi::Object jsEntry = Napi::Object::New(env);
        jsEntry.Set("headword", Napi::String::New(env, [entry.headword UTF8String]));
        jsEntry.Set("text", Napi::String::New(env, [entry.text UTF8String]));
        jsEntry.Set("html", Napi::String::New(env, [entry.HTML UTF8String]));
        jsEntry.Set("htmlWithAppCSS", Napi::String::New(env, [entry.HTMLWithAppCSS UTF8String]));
        jsEntry.Set("htmlWithPopoverCSS", Napi::String::New(env, [entry.HTMLWithPopoverCSS UTF8String]));

        entries.Set(entries.Length(), jsEntry);
      }
      jsResult.Set("entries", entries);
      result.Set(result.Length(), jsResult);
    }
  }
  
  return result;
}

// 模块注册
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  // 导出方法
  exports.Set("lookupWord", 
              Napi::Function::New(env, LookupWord));

  exports.Set("lookupWordHTML", 
              Napi::Function::New(env, LookupWordHTML));
  return exports;
}

NODE_API_MODULE(addon, Init)