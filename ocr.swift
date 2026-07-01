// Flashr OCR helper — on-device text recognition via Apple's Vision framework.
// Usage: ocr <image-path>   ->  prints recognized text (reading order) to stdout.
// Compile: swiftc -O -o bin/ocr ocr.swift -framework Vision -framework AppKit
import Foundation
import Vision
import AppKit

let args = CommandLine.arguments
guard args.count > 1 else {
    FileHandle.standardError.write("usage: ocr <image-path>\n".data(using: .utf8)!)
    exit(2)
}

guard let image = NSImage(contentsOfFile: args[1]),
      let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write("cannot load image: \(args[1])\n".data(using: .utf8)!)
    exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cg, options: [:])
do {
    try handler.perform([request])
    let observations = request.results ?? []
    // Sort top-to-bottom, then left-to-right, so reading order survives.
    let sorted = observations.sorted { a, b in
        if abs(a.boundingBox.origin.y - b.boundingBox.origin.y) > 0.012 {
            return a.boundingBox.origin.y > b.boundingBox.origin.y
        }
        return a.boundingBox.origin.x < b.boundingBox.origin.x
    }
    let lines = sorted.compactMap { $0.topCandidates(1).first?.string }
    print(lines.joined(separator: "\n"))
} catch {
    FileHandle.standardError.write("ocr failed: \(error)\n".data(using: .utf8)!)
    exit(1)
}
