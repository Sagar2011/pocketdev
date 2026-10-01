import AppKit
import ApplicationServices
import CryptoKit

// No screenshots, message text, AX actions, network requests or window activation.
// Only the English Claude Cowork UI observed during development is supported.
func attribute(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
    var value: CFTypeRef?
    return AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success ? value : nil
}
func string(_ element: AXUIElement, _ name: String) -> String {
    attribute(element, name) as? String ?? ""
}
func classify(_ labels: Set<String>) -> String {
    if labels.contains("Claude would like to add this folder to the session:") && labels.contains("Not now") && labels.contains("Add folder") { return "permission" }
    if labels.contains("Skip") && labels.contains(where: { $0.hasPrefix("Asking a question…") }) { return "waiting" }
    if labels.contains("Claude is responding") && labels.contains("Stop response") { return "working" }
    if labels.contains("Claude finished the response") { return "done" }
    return "unknown"
}

func snapshot() -> [String: Any] {
    guard AXIsProcessTrusted() else { return ["status": "permission-required"] }
    guard let app = NSRunningApplication.runningApplications(withBundleIdentifier: "com.anthropic.claudefordesktop").first else { return ["status": "not-running"] }
    let application = AXUIElementCreateApplication(app.processIdentifier)
    AXUIElementSetMessagingTimeout(application, 0.15)
    guard let windows = attribute(application, kAXWindowsAttribute) as? [AXUIElement] else { return ["status": "unavailable"] }
    var sessions = [[String: Any]]()
    var visited = 0
    let deadline = Date().addingTimeInterval(2)
    for window in windows.prefix(16) {
        var stack: [(AXUIElement, Int, Bool)] = [(window, 0, false)]
        var labels = Set<String>()
        var sessionID: String?
        var excludedMessages = false
        while let (element, depth, parentIsPane) = stack.popLast() {
            visited += 1
            guard visited < 2000 && Date() < deadline && depth < 60 else { return ["status": "unavailable"] }
            let role = string(element, kAXRoleAttribute)
            let title = string(element, kAXTitleAttribute)
            let description = string(element, kAXDescriptionAttribute)
            let names = [title, description]
            let inPane = parentIsPane || names.contains("Primary pane")
            // Skip conversation contents and unrelated sidebar sessions entirely.
            if names.contains("Chat messages") { if inPane { excludedMessages = true }; continue }
            if names.contains(where: { ["Sidebar", "Session activity panel"].contains($0) }) { continue }
            if role == "AXWebArea", let url = attribute(element, kAXURLAttribute) as? URL,
               url.host == "claude.ai", url.path.hasPrefix("/cowork/cse_") {
                sessionID = SHA256.hash(data: Data(url.path.utf8)).map { String(format: "%02x", $0) }.joined()
            }
            if inPane && ["AXStaticText", "AXButton"].contains(role) {
                // Values are matched transiently; only normalized states leave this process.
                for label in [title, description, role == "AXStaticText" ? string(element, kAXValueAttribute) : ""] {
                    if ["Claude would like to add this folder to the session:", "Not now", "Add folder", "Skip", "Claude is responding", "Stop response", "Claude finished the response"].contains(label) || label.hasPrefix("Asking a question…") {
                        labels.insert(label)
                    }
                }
            }
            if let children = attribute(element, kAXChildrenAttribute) as? [AXUIElement] {
                stack.append(contentsOf: children.reversed().map { ($0, depth + 1, inPane) })
            }
        }
        // Fail closed on layout changes: never interpret conversation text as status.
        if let id = sessionID, excludedMessages {
            let signal = classify(labels)
            if signal != "unknown" { sessions.append(["id": id, "signal": signal, "minimized": attribute(window, kAXMinimizedAttribute) as? Bool ?? false]) }
        }
    }
    return ["status": "ok", "sessions": sessions]
}

if CommandLine.arguments.contains("--self-test") {
    let running: Set<String> = ["Claude is responding", "Stop response"]
    precondition(classify(running) == "working")
    precondition(classify(running.union(["Claude would like to add this folder to the session:", "Not now", "Add folder"])) == "permission")
    precondition(classify(running.union(["Skip", "Asking a question…  ·  15s"])) == "waiting")
    precondition(classify(["Claude finished the response"]) == "done")
    precondition(classify(["Add folder", "Manually approve"]) == "unknown")
    print("Claude signal classification passed")
    exit(0)
}
if CommandLine.arguments.contains("--request-permission") {
    _ = AXIsProcessTrustedWithOptions([kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary)
}
repeat {
    autoreleasepool {
        if let data = try? JSONSerialization.data(withJSONObject: snapshot(), options: [.sortedKeys]) {
            FileHandle.standardOutput.write(data)
            FileHandle.standardOutput.write(Data([10]))
        }
    }
    if !CommandLine.arguments.contains("--watch") { break }
    Thread.sleep(forTimeInterval: 1)
} while true
