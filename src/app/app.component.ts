import { Component, OnInit, Renderer2, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup, FormControl, FormArray, Validators, AbstractControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [
    trigger('rippleEffect', [
      transition(':enter', [
        style({ transform: 'scale(0)', opacity: 0.5 }),
        animate('300ms ease-out', style({ transform: 'scale(4)', opacity: 0 })),
      ]),
    ]),
  ],
})

export class AppComponent implements OnInit {
  public currentCount = 0;
  tableNo: number | undefined;
  myForm: FormGroup;
  menulist: MenuDetails[] = [];
  menulistData: MenuDetails[] = [];
  formValues: any;
  displayModal: string = 'none';
  isDisplayMessages: boolean = false;
  isDropdownHighlighted: boolean = false;
  tables: number[] = [1, 2, 3, 4, 5, 6];
  menus: string[] = ['chinese', 'pizza', 'sandwich', 'breakfast', 'burger_rolls', 'juices_icecream_dessert'];
  menuColors: string[] = ['#28a745', '#ffc107', '#EA596E', '#17a2b8', '#ED1C24', '#d094ea'];//, '#0054A4', '#939598'
  orderItems: any[] = [];
  selectedTable: any = 0;
  searchTerm = new FormControl('');
  isLoading: boolean = true;
  showNoDataLabel: FormControl = new FormControl('');
  defaultMenu: string = '';
  private cartState: any = {};
  displayedHeaders: string[] = [];
  alertMessage: string = '';

  @ViewChild('menulistRef') menulistRef!: ElementRef;

  ngOnInit(): void {
    this.loadMenu();
    setTimeout(() => {
      this.isLoading = false;
      // Manually trigger change detection
      // this.cdr.detectChanges();
    }, 2000);
  }

  constructor(private renderer: Renderer2, private formBuilder: FormBuilder, private http: HttpClient, private _snackBar: MatSnackBar, private cdr: ChangeDetectorRef) {
    this.renderer.setStyle(document.body, 'background-color', '#222223');
    this.renderer.setStyle(document.body, 'color', '#FFFFFF');
    this.myForm = this.formBuilder.group({
      cartTotalGroup: this.formBuilder.group({
        cartTotalNo: new FormControl()
      }),
      table: ['', Validators.required],
      menulist: this.formBuilder.array([]),
      menulistData: this.formBuilder.array([])
    });
  }

  shouldDisplayHeader(header: string): boolean {
    const category = this.getCategoryFromHeader(header);
    const shouldDisplay = !this.displayedHeaders.includes(category);
    if (shouldDisplay) {
      this.displayedHeaders.push(category);
    }
    return shouldDisplay;
  }

  getCategoryFromHeader(header: string): string {
    if (header.includes('|')) {
      return header.split('|')[1].trim().toUpperCase();
    }
    return header.toUpperCase();
  }

  loadMenu() {
    const fileName = `./assets/menuItems.json`;
    this.http.get<MenuDetails[]>(fileName).subscribe(
      result => {
        this.storeCartState();
        this.menulist = result;
        this.menulistData = result;
        this.populateForm();
        this.restoreCartState();
      },
      error => {
        console.error(error);
      }
    );
  }

  navigateMenu(menu: string) {
    this.displayedHeaders = [];
    const category = this.getCategoryFromHeader(menu);
    const element = document.getElementById(category);
    if (element) {
      // Calculate the scroll position with margin
      const offset = 120; // Adjust this value as needed
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition - offset;
      const currentScroll = window.scrollY;
      const scrollToPosition = currentScroll + offsetPosition;
      window.scrollTo({
        top: scrollToPosition,
        behavior: 'smooth'
      });
    }
  }

  formatMenu(menu: string): string {
    return menu.replace(/_/g, ' & ').toUpperCase();
  }

  populateForm() {
    const menulistFormArray = this.myForm.get('menulist') as FormArray;
    menulistFormArray.clear();
    this.menulist = this.menulistData;
    if (this.menulist != null) {
      this.menulist.forEach(menu => {
        const menuFormGroup = this.formBuilder.group({
          header: menu.header,
          items: this.formBuilder.array([])
        });
        const itemsFormArray = menuFormGroup.get('items') as FormArray;
        menu.items.forEach(item => {
          const itemFormGroup = this.formBuilder.group({
            imgsrc: item.imgsrc,
            name: item.name,
            price1: item.price1,
            price2: item.price2,
            count1: item.count1,
            count2: item.count2
          });
          itemsFormArray.push(itemFormGroup);
        });
        menulistFormArray.push(menuFormGroup);
      });
    }
  }

  // Method to store the state of the cart and counts
  private storeCartState() {
    this.cartState = {
      items: this.orderItems.slice(),
      formValues: this.myForm.value
    };
  }

  // Method to restore the state of the cart and counts
  private restoreCartState() {
    if (this.cartState.items && this.cartState.formValues) {
      this.orderItems = this.cartState.items.slice();
      this.myForm.patchValue(this.cartState.formValues);
      this.generateOrderItems();
    }
  }

  onTableSelectionChange(event: any) {
    this.displayedHeaders = [];
    this.selectedTable = event.target.value;
    this.isDropdownHighlighted = false;
  }

  onDropdownBlur() {
    this.displayedHeaders = [];
  }

  // openSnackBar(message: string, type: string) {
  //   this._snackBar.open(message, 'Close', {
  //     duration: 3000
  //   });
  // }

  closePopup() {
    this.displayedHeaders = [];
    this.displayModal = "none";
    this.isDropdownHighlighted = false;
    this.isDisplayMessages = false;
    this.selectedTable = 0;
  }

  openCart() {
    this.formValues = this.myForm.value;
    this.displayModal = 'none';
    this.generateOrderItems();
    this.displayModal = 'block';
    if (this.orderItems.length > 0) {
      this.isDisplayMessages = false;
    } else {
      this.isDisplayMessages = true;
      this.alertMessage = 'Please select items to add to the cart!';
      // this.openSnackBar('Please select items to add to the cart!', 'X');
    }
  }

  generateOrderItems() {
    this.displayedHeaders = [];
    if (this.orderItems.length == 0) {
      this.showNoDataLabel.setValue('No Items!');
      this.myForm.get('table')?.disable();
      // table: [this.tables[0]];
    } else {
      this.showNoDataLabel.setValue('');
      this.myForm.get('table')?.enable();
    }
    this.orderItems = [];
    if (this.formValues && this.formValues.menulist && (!this.orderItems || this.orderItems.length === 0)) {
      for (const section of this.formValues.menulist) {
        for (const item of section.items) {
          if (item.count1 > 0 || item.count2 > 0) {
            this.orderItems.push({
              name: item.name,
              full: item.count1,
              half: item.count2
            });
          }
        }
      }
      var itemCount = 0;
      this.orderItems.forEach(item => {
        itemCount += item.full + item.half;
      });
      const cartTotalNoControl = this.myForm.get('cartTotalGroup.cartTotalNo');
      if (cartTotalNoControl) {
        cartTotalNoControl.setValue(itemCount);
      } else {
        this.myForm.get('cartTotalGroup.cartTotalNo')?.setValue(itemCount);
      }
    }
  }

  deleteItem(menu: MenuDetails, item: any) {
    const menulistFormArray = this.myForm.get('menulist') as FormArray;
    menulistFormArray.controls.forEach((menuFormGroup: AbstractControl) => {
      if (menuFormGroup instanceof FormGroup && menuFormGroup.value === menu) {
        const itemsFormArray = menuFormGroup.get('items') as FormArray;
        const itemIndex = itemsFormArray.controls.findIndex(control => control.value.name === item.name);
        if (itemIndex !== -1) {
          const itemFormGroup = itemsFormArray.controls[itemIndex] as FormGroup;
          itemFormGroup.get('count1')?.setValue(0);
          itemFormGroup.get('count2')?.setValue(0);
        }
      }
    });
    //Remove the item from the menu's items array
    menu.items = menu.items.filter(i => i !== item);

    //Remove the item from orderItems array based on name and count
    this.orderItems = this.orderItems.filter(orderItem => !(orderItem.name === item.name && orderItem.full === item.count1 && orderItem.half === item.count2));

    this.formValues = this.myForm.value;
    this.generateOrderItems();
  }

  placeOrder() {
    this.displayedHeaders = [];
    this.tableNo = this.selectedTable;
    if (this.tableNo !== undefined && this.tableNo > 0) {
      this.isDropdownHighlighted = false;
      this.isDisplayMessages = true;
      this.selectedTable = 0;
      // this.displayModal = "none";
      this.formValues = null;
      this.myForm.controls['table'].setValue('');
      const dataToSend = {
        selectedTable: this.tableNo,
        userName: 'Grill_N_Shakes',
        orderItems: this.orderItems
      };
      const jwtToken = 'your_jwt_token_here';
      if (jwtToken) {
        const httpOptions = {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          })
        };

        this.http.post('https://localhost:7104/api/Order/Post/AddOrder', dataToSend, httpOptions).subscribe(
          response => {
            // Clear the selected items count
            this.clearSelectedItemsCount();
            this.alertMessage = 'Order placed successfully!';
            // this.openSnackBar('Order placed successfully!', 'X');
            // const menulistFormArray = this.myForm.get('menulist') as FormArray;
            // menulistFormArray.clear();
            // this.menulist = this.menulistData;
          },
          error => {
            // Clear the selected items count
            this.clearSelectedItemsCount();
            this.alertMessage = 'Order Failed! Please contact Hotel Staff.';
            // this.openSnackBar('Order Failed. Please contact Hotel Staff!', 'X');
          }
        );
      }
      else {
        this.alertMessage = 'Token Expired! Please contact Admin.';
        // this.openSnackBar('Token Expired! Please contact Admin.', 'X');
      }
    }
    else {
      this.isDisplayMessages = false;
      this.isDropdownHighlighted = true;
    }
  }

  clearSelectedItemsCount() {
    const menulistFormArray = this.myForm.get('menulist') as FormArray;
    menulistFormArray.controls.forEach((menuFormGroup: AbstractControl) => {
      if (menuFormGroup instanceof FormGroup) {
        const itemsFormArray = menuFormGroup.get('items') as FormArray;
        itemsFormArray.controls.forEach((itemFormGroup: AbstractControl) => {
          if (itemFormGroup instanceof FormGroup) {
            (itemFormGroup.get('count1') as FormControl).setValue(0);
            (itemFormGroup.get('count2') as FormControl).setValue(0);
          }
        });
      }
    });
    this.formValues = this.myForm.value;
    this.generateOrderItems();
  }

  filterMenuItems() {
    this.displayedHeaders = [];
    const filteredMenu: MenuDetails[] = [];
    const searchTermValue = this.searchTerm?.value?.toLowerCase();
    if (searchTermValue) {
      this.menulistData.forEach(menu => {
        const filteredItems: MenuItem[] = menu.items.filter(item => {
          const itemName = item.name.toLowerCase();
          return itemName.includes(searchTermValue);
        });

        if (filteredItems.length > 0) {
          filteredMenu.push({
            header: menu.header,
            items: filteredItems
          });
        }
      });

      // Clear the existing items in the FormArray
      const menulistFormArray = this.myForm.get('menulist') as FormArray;
      menulistFormArray.clear();

      // Add the filtered items to the FormArray
      filteredMenu.forEach(menu => {
        const menuFormGroup = this.formBuilder.group({
          header: menu.header,
          items: this.formBuilder.array([])
        });

        const itemsFormArray = menuFormGroup.get('items') as FormArray;
        menu.items.forEach(item => {
          const itemFormGroup = this.formBuilder.group({
            imgsrc: item.imgsrc,
            name: item.name,
            price1: item.price1,
            price2: item.price2,
            count1: item.count1,
            count2: item.count2
          });

          itemsFormArray.push(itemFormGroup);
        });
        menulistFormArray.push(menuFormGroup);
      });
      this.menulist = filteredMenu;
    } else {
      const menulistFormArray = this.myForm.get('menulist') as FormArray;
      menulistFormArray.clear();
      this.populateForm();
    }
  }

  public incrementCounter1(menuIndex: number, itemIndex: number) {
    const menuFormArray = this.myForm.get('menulist') as FormArray;
    const menuFormGroup = menuFormArray.at(menuIndex) as FormGroup;
    const itemsFormArray = menuFormGroup.get('items') as FormArray;
    const itemFormGroup = itemsFormArray.at(itemIndex) as FormGroup;
    const count1Control = itemFormGroup.get('count1') as FormControl;
    if (count1Control.value < 9) {
      count1Control.setValue(count1Control.value + 1);
    }
    this.formValues = this.myForm.value;
    this.generateOrderItems();
  }

  public incrementCounter2(menuIndex: number, itemIndex: number) {
    const menuFormArray = this.myForm.get('menulist') as FormArray;
    const menuFormGroup = menuFormArray.at(menuIndex) as FormGroup;
    const itemsFormArray = menuFormGroup.get('items') as FormArray;
    const itemFormGroup = itemsFormArray.at(itemIndex) as FormGroup;
    const count2Control = itemFormGroup.get('count2') as FormControl;
    if (count2Control.value < 9) {
      count2Control.setValue(count2Control.value + 1);
    }
    this.formValues = this.myForm.value;
    this.generateOrderItems();
  }

  public decrementCounter1(menuIndex: number, itemIndex: number) {
    const menuFormArray = this.myForm.get('menulist') as FormArray;
    const menuFormGroup = menuFormArray.at(menuIndex) as FormGroup;
    const itemsFormArray = menuFormGroup.get('items') as FormArray;
    const itemFormGroup = itemsFormArray.at(itemIndex) as FormGroup;
    const count1Control = itemFormGroup.get('count1') as FormControl;
    if (count1Control.value > 0) {
      count1Control.setValue(count1Control.value - 1);
    }
    this.formValues = this.myForm.value;
    this.generateOrderItems();
  }

  public decrementCounter2(menuIndex: number, itemIndex: number) {
    const menuFormArray = this.myForm.get('menulist') as FormArray;
    const menuFormGroup = menuFormArray.at(menuIndex) as FormGroup;
    const itemsFormArray = menuFormGroup.get('items') as FormArray;
    const itemFormGroup = itemsFormArray.at(itemIndex) as FormGroup;
    const count2Control = itemFormGroup.get('count2') as FormControl;
    if (count2Control.value > 0) {
      count2Control.setValue(count2Control.value - 1);
    }
    this.formValues = this.myForm.value;
    this.generateOrderItems();
  }
}

interface MenuItem {
  imgsrc: string;
  name: string;
  price1: string;
  price2: string;
  count1: number;
  count2: number;
}

interface MenuDetails {
  header: string;
  items: MenuItem[];
}