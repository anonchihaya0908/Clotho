#include <iostream>
#include <memory>
#include <vector>


class ExampleClass {
public:
  ExampleClass() : value_(0) {}

  void setFunction(int param1, int param2, int param3, int param4, int param5) {
    if (param1 > 0) {
      value_ = param1 + param2;
      std::cout << "Setting value to: " << value_ << std::endl;
    } else {
      value_ = 0;
    }
  }

  std::vector<int> getVector() const { return std::vector<int>{1, 2, 3, 4, 5}; }

private:
  int value_;
};

namespace TestNamespace {
template <typename T> class TemplateClass {
public:
  void processArray(T *array, size_t size) {
    for (size_t i = 0; i < size; ++i) {
      array[i] *= 2;
    }
  }
};
} // namespace TestNamespace

int main() {
  auto example = std::make_unique<ExampleClass>();
  example->setFunction(1, 2, 3, 4, 5);

  TestNamespace::TemplateClass<int> templateInstance;
  int array[] = {1, 2, 3, 4, 5};
  templateInstance.processArray(array, 5);

  return 0;
}
