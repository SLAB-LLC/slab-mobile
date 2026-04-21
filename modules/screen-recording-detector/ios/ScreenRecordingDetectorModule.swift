import ExpoModulesCore
import UIKit

public class ScreenRecordingDetectorModule: Module {
  private var captureObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("ScreenRecordingDetector")

    Events("onCapturedChange")

    OnCreate {
      captureObserver = NotificationCenter.default.addObserver(
        forName: UIScreen.capturedDidChangeNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        guard let self = self else { return }
        self.sendEvent("onCapturedChange", [
          "isCaptured": UIScreen.main.isCaptured
        ])
      }
    }

    OnDestroy {
      if let obs = captureObserver {
        NotificationCenter.default.removeObserver(obs)
      }
    }

    AsyncFunction("isCaptured") { () -> Bool in
      return UIScreen.main.isCaptured
    }
  }
}
